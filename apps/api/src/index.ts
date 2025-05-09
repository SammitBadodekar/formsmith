import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import formRoutes from "./routes/forms";
import workspaceRoutes from "./routes/workspaces";

export type Env = {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  FRONTEND_DOMAIN: string;
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
    allowHeaders: ["Content-Type", "Authorization", "X-session-token"],
    exposeHeaders: ["Content-Range", "X-Content-Range", "X-session-token"],
    maxAge: 600,
  })
);

app.get("/", async (c) => {
  return c.json({ serverUp: true });
});

formRoutes(app);
workspaceRoutes(app);

export default app;
