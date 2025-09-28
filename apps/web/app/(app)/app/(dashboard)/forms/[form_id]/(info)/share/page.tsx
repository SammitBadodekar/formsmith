import ShareForm from "./share-form";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  return (
    <>
      <ShareForm formId={form_id} />
    </>
  );
}
