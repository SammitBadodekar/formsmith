import ShowSubmissions from "./show-submissions";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  return (
    <>
      <ShowSubmissions formId={form_id} />
    </>
  );
}
