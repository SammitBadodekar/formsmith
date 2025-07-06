import { App } from "../..";
import { getWorkspaces } from "./get-workspaces";
import { createWorkspace } from "./create-workspace";
import { deleteWorkspace } from "./delete-workspace";

export default (app: App) => {
  app.get("/workspaces", getWorkspaces);
  app.post("/workspaces", createWorkspace);
  app.delete("/workspaces", deleteWorkspace);
};
