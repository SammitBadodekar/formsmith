import { getForms } from "./get-forms";
import { createForm } from "./create-form";
import { deleteForm } from "./delete-form";
import { app } from "../..";

export default (app: app) => {
  app.get("/forms", getForms);
  app.post("/forms", createForm);
  app.delete("/forms", deleteForm);
};
