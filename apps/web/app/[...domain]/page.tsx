import React from "react";
import ShowPublishedForm from "./show-published-form";
import { getPublishedForm } from "@/lib/queries";
import { CustomizationsStoreProvider } from "../app/(dashboard)/forms/[form_id]/edit/customizations-provider";

const Page = async ({
  params: pramsPromise,
}: {
  params: Promise<{ domain: string[] }>;
}) => {
  const params = await pramsPromise;
  const domain = params.domain[0]?.split(".")[0];
  const path =
    params.domain.reduce((acc, curr, index) => {
      if (index === 0) return acc;
      return acc + "/" + curr;
    }, "") || "/";

  const data = await getPublishedForm(domain, path);
  return (
    <div>
      <CustomizationsStoreProvider
        formId={data?.data?.form?.id}
        customizations={data?.data?.form?.customizations}
      >
        <ShowPublishedForm data={data?.data?.form!} />
      </CustomizationsStoreProvider>
    </div>
  );
};

export default Page;
