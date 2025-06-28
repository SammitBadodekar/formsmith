import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import formRoutes from "./routes/forms";
import workspaceRoutes from "./routes/workspaces";
import submissionRoutes from "./routes/submissions";

export type Env = {
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
  FRONTEND_DOMAIN: string;
  FORM_DOMAIN: string;
  CACHE: KVNamespace;
};
export type app = Hono<{ Bindings: Env }>;
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const { FRONTEND_DOMAIN, FORM_DOMAIN } = env<Env>(c);
      return origin.endsWith(`.${FRONTEND_DOMAIN}`)
        ? `${origin}`
        : origin.endsWith(`.${FORM_DOMAIN}`)
          ? `${origin}`
          : `https://${FRONTEND_DOMAIN}`;
    },
    credentials: true,
    maxAge: 600,
  })
);

app.get("/", async (c) => {
  return c.json({ serverUp: true });
});

// Routes
formRoutes(app);
workspaceRoutes(app);
submissionRoutes(app);

export default app;
