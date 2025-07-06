import { getForms } from "./get-forms";
import { createForm } from "./create-form";
import { deleteForm } from "./delete-form";
import { getForm } from "./get-form";
import { updateForm } from "./update-form";
import { publishForm } from "./publish-form";
import { getPublishedForm } from "./get-published-form";
import { App } from "../..";

export default (app: App) => {
  app.get("/form", getForm);
  app.get("/forms", getForms);
  app.post("/forms", createForm);
  app.delete("/forms", deleteForm);
  app.put("/forms", updateForm);
  app.post("/forms/publish", publishForm);
  app.get("/forms/published", getPublishedForm);
};
