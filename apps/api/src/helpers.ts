import { Env } from ".";
import { Context, Hono } from "hono";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "hono/adapter";
import { Session, sessionTable, User, userTable } from "@formsmith/database";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { eq } from "drizzle-orm";

export const getDB = async (c: Context) => {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env<Env>(c);
  const db = drizzle({
    connection: {
      url: DATABASE_URL,
      authToken: DATABASE_AUTH_TOKEN,
    },
  });
  return db;
};

export type SessionValidationResult =
  | { session: Session; user: User; token?: string }
  | { session: null; user: null; token?: string };

export async function validateSessionToken(
  token: string,
  c: Context
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const db = await getDB(c);
  const result = await db
    .select({ user: userTable, session: sessionTable })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, sessionId));
  if (result.length < 1) {
    return { session: null, user: null };
  }
  const { user, session } = result[0];
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessionTable)
      .set({
        expiresAt: session.expiresAt,
      })
      .where(eq(sessionTable.id, session.id));
  }
  return { session, user };
}
