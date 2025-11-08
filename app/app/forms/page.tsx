import { Suspense } from "react";
import { getForms } from "@/lib/data/forms";
import { getWorkspaces } from "@/lib/data/workspaces";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Forms Page - Example of Next.js 16 Data Fetching Best Practices
 *
 * This page demonstrates:
 * 1. Server Component with direct DB access
 * 2. Parallel data fetching with Promise.all
 * 3. Streaming with Suspense
 * 4. Automatic caching and deduplication
 */

// Loading skeleton component
function FormsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

// Forms List component (can be async if needed)
async function FormsList() {
  const forms = await getForms();

  if (forms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No forms yet</p>
        <Link href="/app/forms/new">
          <Button>Create Your First Form</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {forms.map((form) => (
        <Link
          key={form.id}
          href={`/app/forms/${form.id}`}
          className="block p-6 border rounded-lg hover:border-primary transition-colors"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{form.name}</h3>
              {form.description && (
                <p className="text-muted-foreground mt-1">{form.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>
                  {form.isPublished ? "✅ Published" : "📝 Draft"}
                </span>
                {form.domain && <span className="font-mono">{form.domain}</span>}
                <span>
                  Updated {new Date(form.updatedAt!).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function FormsPage() {
  // Fetch data in parallel - both requests start immediately
  const formsPromise = getForms();
  const workspacesPromise = getWorkspaces();

  // Wait for both to complete
  const [forms, workspaces] = await Promise.all([
    formsPromise,
    workspacesPromise,
  ]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Forms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your forms across {workspaces.length} workspace
            {workspaces.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/app/forms/new">
          <Button>Create Form</Button>
        </Link>
      </div>

      {/* Stream the forms list while it's loading */}
      <Suspense fallback={<FormsListSkeleton />}>
        <FormsList />
      </Suspense>
    </div>
  );
}
