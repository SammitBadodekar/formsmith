import EditForm from "./edit-form";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  console.log(await params);
  const { slug } = await params;
  return (
    <>
      <EditForm />
    </>
  );
}
