import { AppSidebar } from "@/app/app/(dashboard)/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import DynamicBreadcrumb from "./header-breadcrumb";
import { DashboardDataProvider } from "./dashboard-data-provider";
import { getForms } from "@/lib/data/forms";
import { getWorkspacesWithForms } from "@/lib/data/workspaces";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch data in parallel
  const formsPromise = getForms();
  const workspacesPromise = getWorkspacesWithForms();

  const [forms, workspaces] = await Promise.all([
    formsPromise,
    workspacesPromise,
  ]);

  return (
    <DashboardDataProvider forms={forms} workspaces={workspaces}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 bg-white">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardDataProvider>
  );
}
