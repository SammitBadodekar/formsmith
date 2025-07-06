import { App } from "../..";
import { upload } from "./upload";

export default (app: App) => {
  app.post("/upload", upload);
};
