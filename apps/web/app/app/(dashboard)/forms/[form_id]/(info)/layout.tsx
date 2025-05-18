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
    <div className="pt-8 sm:px-8 md:px-20 2xl:px-56">
      <FormInfo formId={form_id} children={children} />
    </div>
  );
};

export default FormInfoLayout;
