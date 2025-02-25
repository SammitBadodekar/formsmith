import { Hono } from "hono";
import { cors } from "hono/cors";
import userRoutes from "./routes/users";

export type Env = {
  zapstr: KVNamespace;
  DATABASE_URL: string;
  DATABASE_AUTH_TOKEN: string;
};
const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: ["https://zapstr.samx.in", "https://localhost:3000"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "X-session-token"],
    exposeHeaders: ["Content-Range", "X-Content-Range", "X-session-token"],
    maxAge: 600,
  })
);

app.get("/", async (c) => {
  return c.json({ serverUp: true });
});

userRoutes(app);

export default app;
