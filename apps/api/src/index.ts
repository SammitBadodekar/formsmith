import { Hono } from "hono";
import { cors } from "hono/cors";
import userRoutes from "./routes/users";
import { validateSessionToken } from "./helpers";
import { env } from "hono/adapter";

export type Env = {
  zapstr: KVNamespace;
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  FRONTEND_DOMAIN: string;
};
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
    allowHeaders: ["Content-Type", "Authorization", "X-session-token"],
    exposeHeaders: ["Content-Range", "X-Content-Range", "X-session-token"],
    maxAge: 600,
  })
);

app.get("/", async (c) => {
  const sessionToken = c.req.header("x-session-token");
  const { session, user } = await validateSessionToken(sessionToken!, c);
  return c.json({ serverUp: true });
});

userRoutes(app);

export default app;
