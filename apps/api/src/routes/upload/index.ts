import { app } from "../..";
import { upload } from "./upload";

export default (app: app) => {
  app.post("/upload", upload);
};
