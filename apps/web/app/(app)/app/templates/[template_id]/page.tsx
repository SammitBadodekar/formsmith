import ShowPublishedForm from "@/app/(app)/[...domain]/show-published-form";
import { getTemplate } from "@/lib/queries";
import { CustomizationsStoreProvider } from "../../(dashboard)/forms/[form_id]/edit/customizations-provider";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ template_id: string }>;
}) {
  const { template_id } = await params;
  const data = await getTemplate(template_id);
  return (
    <>
      <CustomizationsStoreProvider
        formId={template_id}
        customizations={data?.data?.template?.customizations}
      >
        <ShowPublishedForm data={data?.data?.template!} isPreview={true} />
      </CustomizationsStoreProvider>
    </>
  );
}
