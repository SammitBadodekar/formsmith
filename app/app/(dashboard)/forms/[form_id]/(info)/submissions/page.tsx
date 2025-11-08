import ShowSubmissions from "./show-submissions";
import { getFormSubmissions } from "@/lib/data/submissions";

export default async function Page({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  const submissions = await getFormSubmissions(form_id);

  return (
    <>
      <ShowSubmissions submissions={submissions} />
    </>
  );
}
