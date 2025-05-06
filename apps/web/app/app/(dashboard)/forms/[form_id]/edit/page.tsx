import EditForm from "./edit-form";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  console.log(await params);
  const { form_id } = await params;
  return (
    <>
      <EditForm formId={form_id} />
    </>
  );
}
