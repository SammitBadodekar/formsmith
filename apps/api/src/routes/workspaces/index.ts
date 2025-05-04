import { app } from "../..";
import { getWorkspaces } from "./get-workspaces";
import { createWorkspace } from "./create-workspace";
import { deleteWorkspace } from "./delete-workspace";

export default (app: app) => {
  app.get("/workspaces", getWorkspaces);
  app.post("/workspaces", createWorkspace);
  app.delete("/workspaces", deleteWorkspace);
};
