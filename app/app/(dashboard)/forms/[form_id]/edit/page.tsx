import EditForm from "./edit-form";
import { CustomizationsStoreProvider } from "./customizations-provider";
import { getForm } from "@/lib/data/forms";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  const form = await getForm(form_id);

  return (
    <>
      <CustomizationsStoreProvider
        formId={form_id}
        customizations={form.customizations}
      >
        <EditForm form={form} formId={form_id} />
      </CustomizationsStoreProvider>
    </>
  );
}
