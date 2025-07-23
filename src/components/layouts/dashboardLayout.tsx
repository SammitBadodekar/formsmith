import { AppSidebar } from "@/pages/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import DynamicBreadcrumb from "@/pages/dashboard/header-breadcrumb";
import { Outlet } from "react-router";

export default function DashboardLayout() {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <Content />
      </SidebarProvider>
    </>
  );
}

const Content = () => {
  const { open } = useSidebar();
  return (
    <SidebarInset
      className={`${open ? "ml-[250px]" : "ml-0"} transition-all ease-linear`}
    >
      <header
        className={`sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 bg-white`}
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <DynamicBreadcrumb />
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4">
        <Outlet />
      </div>
    </SidebarInset>
  );
};
