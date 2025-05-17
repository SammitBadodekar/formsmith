import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import formRoutes from "./routes/forms";
import workspaceRoutes from "./routes/workspaces";
import { WorkersKVStore } from "@hono-rate-limiter/cloudflare";
import { rateLimiter } from "hono-rate-limiter";
import { Context, Next } from "hono";

export type Env = {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  FRONTEND_DOMAIN: string;
  CACHE: KVNamespace;
};
export type app = Hono<{ Bindings: Env }>;
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const { FRONTEND_DOMAIN } = env<Env>(c);
      return origin.endsWith(`.${FRONTEND_DOMAIN}`)
        ? origin
        : `https://${FRONTEND_DOMAIN}`;
    },
    credentials: true,
    maxAge: 600,
  })
);

app.use((c: Context, next: Next) =>
  rateLimiter<{ Bindings: Env }>({
    windowMs: 2 * 60 * 1000, // 2 minute
    limit: 200, // Limit each IP to 100 requests per 2 minutes.
    standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    keyGenerator: (c) => c.req.header("cf-connecting-ip") ?? "",
    store: new WorkersKVStore({ namespace: c.env.CACHE }),
  })(c, next)
);

app.get("/", async (c) => {
  return c.json({ serverUp: true });
});

formRoutes(app);
workspaceRoutes(app);

export default app;
