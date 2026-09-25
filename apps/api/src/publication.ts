import {
  controlHeaders,
  MAX_POLICY_AGE_MS,
  manifestSchema,
  parseKeyring,
} from "@formsmith/core/intake";
import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { cloudflareDomains, providerRecords } from "./cloudflare-domains";
import type { Config } from "./config";
import type { Database } from "./db";
import { customDomains, forms, formVersions, jobs } from "./db/schema";
import type { Job } from "./job-queue";

export function publicationService(db: Database, config: Config) {
  const selfHostedDomains = config.CUSTOM_DOMAIN_PROVIDER === "selfhost";
  const keys = parseKeyring(config.CONTROL_KEYS),
    provider = cloudflareDomains(config);
  async function intake(path: string, value: unknown) {
    const body = JSON.stringify(value),
      url = new URL(path, config.INTAKE_URL);
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: await controlHeaders("POST", url.pathname, body, keys, config.ACTIVE_KEY_ID),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Intake synchronization failed (${response.status})`);
    return response.json() as Promise<{ revision: number }>;
  }
  async function refreshForms() {
    await db.transaction(async (tx) => {
      const stale = await tx
        .select()
        .from(forms)
        .where(
          and(
            isNotNull(forms.publishedVersionId),
            isNull(forms.archivedAt),
            sql`NOT EXISTS (SELECT 1 FROM jobs j WHERE j.kind = 'sync_form' AND j.payload->>'formId' = ${forms.id}::text AND j.created_at > now() - interval '6 hours')`,
          ),
        )
        .limit(100)
        .for("update", { skipLocked: true });
      for (const form of stale) {
        if (!form.publishedVersionId) continue;
        const [version] = await tx
          .select()
          .from(formVersions)
          .where(eq(formVersions.id, form.publishedVersionId));
        if (!version) continue;
        const revision = form.policyRevision + 1;
        await tx.update(forms).set({ policyRevision: revision }).where(eq(forms.id, form.id));
        await tx.insert(jobs).values({
          kind: "sync_form",
          dedupeKey: `sync:${form.id}:${revision}`,
          payload: {
            formId: form.id,
            revision,
            versionId: version.id,
            definition: version.definition,
            closed: form.closed,
            validUntil: Date.now() + MAX_POLICY_AGE_MS,
          },
        });
      }
    });
  }
  return {
    async syncForm(job: Job) {
      const manifest = manifestSchema.parse(job.payload);
      if (manifest.validUntil <= Date.now()) {
        await refreshForms();
        return;
      }
      const result = await intake("/internal/publish", manifest);
      if (result.revision < manifest.revision)
        throw new Error("Intake did not acknowledge publication revision");
      await db
        .update(forms)
        .set({
          syncedPolicyRevision: sql`greatest(${forms.syncedPolicyRevision}, ${manifest.revision})`,
        })
        .where(eq(forms.id, manifest.definition.id));
    },
    async syncDomain(job: Job) {
      const id = String(job.payload.domainId);
      const [domain] = await db.select().from(customDomains).where(eq(customDomains.id, id));
      if (!domain?.verifiedAt || domain.status === "removed") return;
      let remote =
        domain.status === "removing" || selfHostedDomains
          ? null
          : await provider.ensure(domain.hostname, domain.providerId);
      if (remote && remote.hostname !== domain.hostname)
        throw new Error("Provider hostname mismatch");
      if (remote) await provider.ensureRoute(domain.hostname);
      // Each send receives a global monotonic revision, including retries and transfer
      // between workspaces. Old leased workers cannot overwrite a newer revocation.
      const [current] = await db
        .update(customDomains)
        .set({
          routeRevision: sql`nextval('domain_route_revision')`,
          providerId: remote?.id ?? domain.providerId,
          checkedAt: new Date(),
        })
        .where(and(eq(customDomains.id, domain.id), eq(customDomains.revision, domain.revision)))
        .returning();
      if (!current) throw new Error("Domain configuration changed during provisioning");
      const members = await db
        .select({ id: forms.id })
        .from(forms)
        .where(
          and(
            eq(forms.workspaceId, domain.workspaceId),
            isNull(forms.archivedAt),
            isNotNull(forms.publishedVersionId),
          ),
        );
      const active =
        domain.status !== "removing" &&
        (selfHostedDomains || (remote?.status === "active" && remote.ssl?.status === "active"));
      const allowed = members.map((f) => f.id);
      const result = await intake("/internal/domain", {
        hostname: current.hostname,
        revision: current.routeRevision,
        active,
        formIds: domain.status === "removing" ? [] : allowed,
        defaultFormId:
          domain.status !== "removing" &&
          domain.defaultFormId &&
          allowed.includes(domain.defaultFormId)
            ? domain.defaultFormId
            : null,
        validUntil: Date.now() + MAX_POLICY_AGE_MS,
      });
      if (result.revision !== current.routeRevision)
        throw new Error("Domain synchronization superseded");
      if (domain.status === "removing") {
        // Route revocation precedes certificate deletion and releasing ownership.
        // Reconcile an unknown create outcome even when providerId was never saved.
        if (!selfHostedDomains) {
          if (!current.providerId) remote = await provider.find(current.hostname);
          const providerId = current.providerId ?? remote?.id;
          if (providerId) await provider.remove(providerId);
          await provider.removeRoute(current.hostname);
        }
        await db
          .update(customDomains)
          .set({
            status: "removed",
            verifiedAt: null,
            providerId: null,
            syncedRevision: domain.revision,
            lastError: null,
          })
          .where(
            and(
              eq(customDomains.id, id),
              eq(customDomains.revision, domain.revision),
              eq(customDomains.routeRevision, current.routeRevision),
            ),
          );
      } else {
        await db
          .update(customDomains)
          .set({
            status: active ? "active" : "provisioning",
            sslStatus: selfHostedDomains ? "managed_by_host" : (remote?.ssl?.status ?? "pending"),
            verificationRecords: remote ? providerRecords(remote) : [],
            syncedRevision: domain.revision,
            lastError: null,
          })
          .where(
            and(
              eq(customDomains.id, id),
              eq(customDomains.revision, domain.revision),
              eq(customDomains.routeRevision, current.routeRevision),
            ),
          );
      }
    },
    async refresh() {
      await refreshForms();
      const stale = await db
        .select()
        .from(customDomains)
        .where(
          and(
            isNotNull(customDomains.verifiedAt),
            ne(customDomains.status, "removed"),
            sql`(${customDomains.checkedAt} is null or ${customDomains.checkedAt} < now() - interval '5 minutes')`,
          ),
        )
        .limit(100);
      const bucket = Math.floor(Date.now() / 300000);
      for (const domain of stale)
        await db
          .insert(jobs)
          .values({
            kind: "sync_domain",
            dedupeKey: `domain-check:${domain.id}:${bucket}`,
            payload: { domainId: domain.id },
          })
          .onConflictDoNothing();
    },
  };
}
