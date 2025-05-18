import formsmithAxios from "./axios";

export const getForms = async () => {
  const { data } = await formsmithAxios.get("/forms");
  return data;
};

export const getForm = async (formId: string) => {
  const { data } = await formsmithAxios.get(`/form`, {
    params: {
      form_id: formId,
    },
  });
  return data;
};

export const getWorkspaces = async () => {
  const { data } = await formsmithAxios.get("/workspaces");
  return data;
};

export const getPublishedForm = async (domain: string, path: string) => {
  const { data } = await formsmithAxios.get(`/forms/published`, {
    params: {
      domain: domain,
      path: path,
    },
  });
  return data;
};
