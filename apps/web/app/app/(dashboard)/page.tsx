import { getQueryClient } from "@/components/get-query-client";
import ShowForms from "./show-forms";
import { getForms, getWorkspaces } from "@/lib/queries";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function Page() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["getForms"],
      queryFn: getForms,
    }),
    queryClient.prefetchQuery({
      queryKey: ["getWorkspaces"],
      queryFn: getWorkspaces,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex w-full justify-center">
        <ShowForms />
      </main>
    </HydrationBoundary>
  );
}
