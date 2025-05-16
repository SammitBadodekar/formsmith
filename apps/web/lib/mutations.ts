import { z } from "zod";
import formsmithAxios from "./axios";
import { CreateFormSchema } from "@/components/modals/create-form";
import { toast } from "sonner";

export const createForm = async ({
  formName,
  formDescription,
  workspaceId,
}: z.infer<typeof CreateFormSchema>) => {
  const { data } = await formsmithAxios.post("/forms", {
    name: formName,
    description: formDescription,
    workspaceId,
  });
  return data;
};

export const deleteForm = async (formId: string) => {
  const data = await new Promise((resolve, reject) => {
    toast.promise(
      formsmithAxios.delete(`/forms`, {
        params: {
          form_id: formId,
        },
      }),
      {
        loading: "Loading...",
        success: (data) => {
          resolve(data);
          return "Successfully deleted form";
        },
        error: (error) => {
          reject(error);
          return "Error deleting form";
        },
        position: "top-center",
      },
    );
  });
  return data;
};

export const updateForm = async ({
  formId,
  formData,
}: {
  formId: string;
  formData: any;
}) => {
  const { data } = await formsmithAxios.put(`/forms`, {
    ...formData,
    id: formId,
  });
  return data;
};

export const publishForm = async ({
  formId,
  formData,
}: {
  formId: string;
  formData: any;
}) => {
  const { data } = await formsmithAxios.post(`/forms/publish`, {
    ...formData,
    id: formId,
  });
  return data;
};
