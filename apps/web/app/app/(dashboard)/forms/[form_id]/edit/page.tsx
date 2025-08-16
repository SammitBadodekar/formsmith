import EditForm from "./edit-form";
import { CustomizationsStoreProvider } from "./customizations-provider";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  return (
    <>
      <CustomizationsStoreProvider formId={form_id}>
        <EditForm formId={form_id} />
      </CustomizationsStoreProvider>
    </>
  );
}
