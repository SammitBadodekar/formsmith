import { App } from "../..";
import { submitForm } from "./submit-form";
import { getSubmissions } from "./get-submissions";

export default (app: App) => {
  app.post("/submissions", submitForm);
  app.get("/submissions", getSubmissions);
};
