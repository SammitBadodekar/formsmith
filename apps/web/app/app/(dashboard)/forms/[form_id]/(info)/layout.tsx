import React from "react";
import FormInfo from "./form-info";

const FormInfoLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ form_id: string }>;
}) => {
  const { form_id } = await params;
  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-[900px]">
        <FormInfo formId={form_id} children={children} />
      </div>
    </div>
  );
};

export default FormInfoLayout;
