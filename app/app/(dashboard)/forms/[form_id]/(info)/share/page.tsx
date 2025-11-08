import ShareForm from "./share-form";
import { getForm } from "@/lib/data/forms";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  const form = await getForm(form_id);

  return (
    <>
      <ShareForm form={form} />
    </>
  );
}
