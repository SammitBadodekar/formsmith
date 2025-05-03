import { app } from "../..";
import { getUserInfo } from "./getUserInfo";

export default (app: app) => {
  app.get("/users/me", getUserInfo);
};
