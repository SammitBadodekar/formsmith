import { and, eq } from "drizzle-orm";
import type { Database } from "./db";
import { agentRevocations, oauthAccessToken, oauthConsent, oauthRefreshToken } from "./db/schema";
import { ServiceError } from "./repository";

export function agentAccess(db: Database) {
  return {
    async revoke(ownerId: string, consentId: string) {
      await db.transaction(async (tx) => {
        const [consent] = await tx
          .select()
          .from(oauthConsent)
          .where(and(eq(oauthConsent.id, consentId), eq(oauthConsent.userId, ownerId)))
          .for("update");
        if (!consent) throw new ServiceError(404, "Connection not found");
        const now = new Date();
        await tx
          .insert(agentRevocations)
          .values({ ownerId, clientId: consent.clientId, revokedAt: now })
          .onConflictDoUpdate({
            target: [agentRevocations.ownerId, agentRevocations.clientId],
            set: { revokedAt: now },
          });
        await tx
          .update(oauthRefreshToken)
          .set({ revoked: now, rotationReplayResponse: null, rotationReplayExpiresAt: null })
          .where(
            and(
              eq(oauthRefreshToken.userId, ownerId),
              eq(oauthRefreshToken.clientId, consent.clientId),
            ),
          );
        await tx
          .update(oauthAccessToken)
          .set({ revoked: now })
          .where(
            and(
              eq(oauthAccessToken.userId, ownerId),
              eq(oauthAccessToken.clientId, consent.clientId),
            ),
          );
        await tx
          .delete(oauthConsent)
          .where(
            and(eq(oauthConsent.userId, ownerId), eq(oauthConsent.clientId, consent.clientId)),
          );
      });
    },
    async permissions(ownerId: string, clientId: unknown, issuedAt: unknown, resource: string) {
      if (typeof clientId !== "string" || typeof issuedAt !== "number") return null;
      const rows = await db
        .select({ consent: oauthConsent, revokedAt: agentRevocations.revokedAt })
        .from(oauthConsent)
        .leftJoin(
          agentRevocations,
          and(eq(agentRevocations.ownerId, ownerId), eq(agentRevocations.clientId, clientId)),
        )
        .where(and(eq(oauthConsent.userId, ownerId), eq(oauthConsent.clientId, clientId)));
      const grant = rows.find(
        ({ consent, revokedAt }) =>
          (!revokedAt || issuedAt * 1000 > revokedAt.getTime()) &&
          issuedAt * 1000 >= consent.createdAt.getTime() &&
          (!consent.resources?.length || consent.resources.includes(resource)),
      );
      return grant ? new Set(grant.consent.scopes) : null;
    },
  };
}
