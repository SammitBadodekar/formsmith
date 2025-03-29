import { Hono } from "hono";
import { cors } from "hono/cors";
import userRoutes from "./routes/users";
import { validateSessionToken } from "./helpers";

export type Env = {
  zapstr: KVNamespace;
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
};
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: (origin) =>
      origin.endsWith(".formsmith.sbs") ? origin : "https://formsmith.sbs",
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
