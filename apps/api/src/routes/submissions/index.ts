import { app } from "../..";
import { submitForm } from "./submit-form";
import { getSubmissions } from "./get-submissions";

export default (app: app) => {
  app.post("/submissions", submitForm);
  app.get("/submissions", getSubmissions);
};
