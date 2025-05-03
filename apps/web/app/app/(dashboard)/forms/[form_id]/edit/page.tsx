import Editor from "@/components/editor/editor";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  console.log(await params);
  const { slug } = await params;
  return (
    <div>
      <Editor image="" logo="" />
    </div>
  );
}
