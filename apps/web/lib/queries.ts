import { publishedFormTable } from "@formsmith/database";
import formsmithAxios from "./axios";
import { and, eq } from "drizzle-orm";
import { db } from "./db";

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

export const getSubmissions = async (formId: string) => {
  const { data } = await formsmithAxios.get(`/submissions`, {
    params: {
      form_id: formId,
    },
  });
  return data?.data?.submissions ?? [];
};
