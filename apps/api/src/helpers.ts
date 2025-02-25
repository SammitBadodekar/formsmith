import { Env } from ".";
import { Context, Hono } from "hono";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "hono/adapter";

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
