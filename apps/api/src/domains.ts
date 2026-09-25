import { resolveTxt } from "node:dns/promises";
import { domainToASCII } from "node:url";
import { newId } from "@formsmith/core";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Database } from "./db";
import { customDomains, jobs } from "./db/schema";
import { repository, ServiceError } from "./repository";

export function normalizeHostname(input: string, reserved: string[]): string {
  const trimmed = input.trim().toLowerCase().replace(/\.$/, "");
  if (/[\s/:@?#\\%]/.test(trimmed))
    throw new ServiceError(400, "Enter a hostname without a protocol, port, or path");
  const hostname = domainToASCII(trimmed);
  const labels = hostname.split(".");
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    !/[a-z]/.test(labels.at(-1) ?? "") ||
    ["localhost", "local", "internal", "test", "invalid"].includes(labels.at(-1) ?? "")
  )
    throw new ServiceError(400, "Enter a public DNS hostname");
  if (reserved.some((name) => hostname === name || hostname.endsWith(`.${name}`)))
    throw new ServiceError(400, "This hostname is reserved for the service");
  return hostname;
}
type DomainOptions = {
  canonicalHost: string;
  cnameTarget: string;
  resolve?: (name: string) => Promise<string[][]>;
};
export function domainService(db: Database, options: DomainOptions) {
  const repo = repository(db);
  const dns = options.resolve ?? resolveTxt;
  async function owned(ownerId: string, domainId: string) {
    const ws = await repo.workspace(ownerId);
    const [domain] = await db
      .select()
      .from(customDomains)
      .where(and(eq(customDomains.id, domainId), eq(customDomains.workspaceId, ws.id)));
    if (!domain) throw new ServiceError(404, "Domain not found");
    return domain;
  }
  function present(domain: typeof customDomains.$inferSelect) {
    return {
      ...domain,
      records: [
        { type: "TXT", name: `_formsmith.${domain.hostname}`, value: domain.verificationToken },
        { type: "CNAME", name: domain.hostname, value: options.cnameTarget },
        ...domain.verificationRecords,
      ],
    };
  }
  return {
    async list(ownerId: string) {
      const ws = await repo.workspace(ownerId);
      return (
        await db
          .select()
          .from(customDomains)
          .where(and(eq(customDomains.workspaceId, ws.id), ne(customDomains.status, "removed")))
      ).map(present);
    },
    async add(ownerId: string, input: string, defaultFormId?: string) {
      const hostname = normalizeHostname(input, [options.canonicalHost, options.cnameTarget]);
      const ws = await repo.workspace(ownerId);
      if (defaultFormId) await repo.owned(ownerId, defaultFormId);
      const [existing] = await db
        .select()
        .from(customDomains)
        .where(and(eq(customDomains.workspaceId, ws.id), eq(customDomains.hostname, hostname)));
      if (existing && existing.status !== "removed") return present(existing);
      const values = {
        workspaceId: ws.id,
        hostname,
        verificationToken: `formsmith=${newId()}${newId()}`,
        defaultFormId: defaultFormId ?? null,
      };
      const [domain] = existing
        ? await db
            .update(customDomains)
            .set({
              ...values,
              verifiedAt: null,
              providerId: null,
              status: "pending",
              revision: sql`${customDomains.revision} + 1`,
              routeRevision: sql`nextval('domain_route_revision')`,
              syncedRevision: 0,
              lastError: null,
              sslStatus: null,
              verificationRecords: [],
            })
            .where(and(eq(customDomains.id, existing.id), eq(customDomains.status, "removed")))
            .returning()
        : await db.insert(customDomains).values(values).onConflictDoNothing().returning();
      if (!domain) throw new ServiceError(409, "Domain setup changed. Refresh and try again.");
      return present(domain);
    },
    async verify(ownerId: string, domainId: string) {
      const domain = await owned(ownerId, domainId);
      if (["removing", "removed"].includes(domain.status))
        throw new ServiceError(409, "Add this domain again before verifying it");
      let records: string[][];
      try {
        records = await dns(`_formsmith.${domain.hostname}`);
      } catch {
        throw new ServiceError(
          422,
          "Ownership TXT record is not visible yet. Check DNS and try again.",
        );
      }
      if (!records.some((parts) => parts.join("") === domain.verificationToken))
        throw new ServiceError(422, "Ownership TXT record does not match this workspace");
      return db.transaction(async (tx) => {
        // Serialize ownership transitions for this hostname, including separate pending claims.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${domain.hostname}, 0))`,
        );
        const [claimed] = await tx
          .select()
          .from(customDomains)
          .where(
            and(
              eq(customDomains.hostname, domain.hostname),
              sql`${customDomains.verifiedAt} is not null`,
            ),
          );
        if (claimed && claimed.id !== domain.id)
          throw new ServiceError(409, "This domain is already connected to a workspace");
        const [updated] = await tx
          .update(customDomains)
          .set({
            verifiedAt: new Date(),
            status: "provisioning",
            revision: sql`${customDomains.revision} + 1`,
            routeRevision: sql`nextval('domain_route_revision')`,
            lastError: null,
          })
          .where(and(eq(customDomains.id, domain.id), eq(customDomains.revision, domain.revision)))
          .returning();
        if (!updated) throw new ServiceError(409, "Domain setup changed. Refresh and try again.");
        await tx.insert(jobs).values({
          kind: "sync_domain",
          dedupeKey: `domain:${updated.id}:${updated.revision}`,
          payload: { domainId: updated.id },
        });
        return present(updated);
      });
    },
    async configure(ownerId: string, domainId: string, defaultFormId: string | null) {
      const domain = await owned(ownerId, domainId);
      if (defaultFormId) await repo.owned(ownerId, defaultFormId);
      if (["removing", "removed"].includes(domain.status))
        throw new ServiceError(409, "Domain is being removed");
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(customDomains)
          .set({
            defaultFormId,
            revision: sql`${customDomains.revision} + 1`,
            routeRevision: sql`nextval('domain_route_revision')`,
          })
          .where(and(eq(customDomains.id, domain.id), eq(customDomains.revision, domain.revision)))
          .returning();
        if (!updated) throw new ServiceError(409, "Domain setup changed. Refresh and try again.");
        if (updated.verifiedAt)
          await tx.insert(jobs).values({
            kind: "sync_domain",
            dedupeKey: `domain:${updated.id}:${updated.revision}`,
            payload: { domainId: updated.id },
          });
        return present(updated);
      });
    },
    async remove(ownerId: string, domainId: string) {
      const domain = await owned(ownerId, domainId);
      if (domain.status === "removed" || domain.status === "removing") return present(domain);
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(customDomains)
          .set({
            status: domain.verifiedAt ? "removing" : "removed",
            revision: sql`${customDomains.revision} + 1`,
            routeRevision: sql`nextval('domain_route_revision')`,
          })
          .where(and(eq(customDomains.id, domain.id), eq(customDomains.revision, domain.revision)))
          .returning();
        if (!updated) throw new ServiceError(409, "Domain setup changed. Refresh and try again.");
        if (domain.verifiedAt)
          await tx.insert(jobs).values({
            kind: "sync_domain",
            dedupeKey: `domain:${updated.id}:${updated.revision}`,
            payload: { domainId: updated.id },
          });
        return present(updated);
      });
    },
  };
}
