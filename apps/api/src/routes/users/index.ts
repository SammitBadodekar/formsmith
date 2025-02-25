import { getUserInfo } from "./getUserInfo";

export default (app: any) => {
  app.get("/users/me", getUserInfo);
};
