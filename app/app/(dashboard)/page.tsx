import { Suspense } from "react";
import ShowForms from "./show-forms";
import { getForms } from "@/lib/data/forms";
import { getWorkspaces } from "@/lib/data/workspaces";
import FormsLoading from "@/components/skeletons/forms-loading";

/**
 * Dashboard Home Page - Server Component
 * Fetches forms and workspaces using Next.js 16 patterns
 */
export default async function Page() {
  // Fetch data in parallel
  const formsPromise = getForms();
  const workspacesPromise = getWorkspaces();

  const [forms, workspaces] = await Promise.all([
    formsPromise,
    workspacesPromise,
  ]);

  const workspaceId = workspaces[0]?.id;

  return (
    <main className="flex w-full justify-center">
      <Suspense fallback={<FormsLoading />}>
        <ShowForms forms={forms} workspaceId={workspaceId} />
      </Suspense>
    </main>
  );
}
