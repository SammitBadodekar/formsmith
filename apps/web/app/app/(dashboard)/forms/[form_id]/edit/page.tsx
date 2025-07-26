import { Provider } from "jotai";
import EditForm from "./edit-form";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  return (
    <>
      <Provider>
        <EditForm formId={form_id} />
      </Provider>
    </>
  );
}
