"use client";
import EditForm from "./edit-form";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  return (
    <>
      <EditForm formId={form_id} />
    </>
  );
}
