import { App } from "../..";
import { createTemplate } from "./create-template";
import { getTemplate } from "./get-template";
import { updateTemplate } from "./update-template";

export default (app: App) => {
  app.post("/templates", createTemplate);
  app.get("/template", getTemplate);
  app.put("/template", updateTemplate);
};
