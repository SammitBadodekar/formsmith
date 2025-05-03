import { z } from "zod";
import formsmithAxios from "./axios";
import { CreateFormSchema } from "@/components/modals/create-form";

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
