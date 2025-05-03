import formsmithAxios from "./axios";

export const getForms = async () => {
  const { data } = await formsmithAxios.get("/forms");
  return data;
};
