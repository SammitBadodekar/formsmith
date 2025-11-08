import React from "react";
import FormInfo from "./form-info";
import { getForm } from "@/lib/data/forms";

const FormInfoLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ form_id: string }>;
}) => {
  const { form_id } = await params;
  const form = await getForm(form_id);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-[900px]">
        <FormInfo form={form} children={children} />
      </div>
    </div>
  );
};

export default FormInfoLayout;
