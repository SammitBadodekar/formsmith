import { getForms } from "./getForms";
import { createForms } from "./createForm";
import { app } from "../..";

export default (app: app) => {
  app.get("/forms", getForms);
  app.post("/forms", createForms);
};
