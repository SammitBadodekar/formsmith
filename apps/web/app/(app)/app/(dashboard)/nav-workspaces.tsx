"use client";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Form, Workspace } from "@formsmith/database";
import WorkspacesLoading from "@/components/skeletons/workspaces-loading";
import { useState } from "react";
import Link from "next/link";
import CreateForm from "@/components/modals/create-form";
import { usePathname } from "next/navigation";
import { useGetWorkspacesQuery } from "@/hooks/use-queries";
import { useInvalidateFormCache } from "./use-invalidate-cache";

type WorkspaceWithForms = Workspace & { forms: Form[] };

export function NavWorkspaces() {
  const { data, isLoading } = useGetWorkspacesQuery();
  const workspaces: WorkspaceWithForms[] = data?.data?.workspaces;
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-semibold">
        Workspaces
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading && <WorkspacesLoading />}
          {!isLoading &&
            workspaces.map((workspace: WorkspaceWithForms, index: number) => (
              <WorkspaceItem
                workspace={workspace}
                index={index}
                key={workspace.id}
              />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

const WorkspaceItem = ({
  workspace,
  index,
}: {
  workspace: WorkspaceWithForms;
  index: number;
}) => {
  const [open, setOpen] = useState(index === 0);
  const pathname = usePathname();
  const { invalidateFormCache } = useInvalidateFormCache();
  return (
    <Collapsible key={workspace.name} open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="pl-8">
          <Link href="">
            <p>{workspace.name}</p>
          </Link>
        </SidebarMenuButton>
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            className="left-2 bg-sidebar-accent text-sidebar-accent-foreground data-[state=open]:rotate-90"
            showOnHover
          >
            <ChevronRight />
          </SidebarMenuAction>
        </CollapsibleTrigger>
        <SidebarMenuAction showOnHover>
          <CreateForm
            workspaceId={workspace.id}
            customTriggerElement={<Plus />}
          />
        </SidebarMenuAction>
        <CollapsibleContent className="w-full">
          <SidebarMenuSub>
            {workspace.forms
              .sort((a, b) => {
                const aDate = new Date(a.updatedAt!)?.getTime?.();
                const bDate = new Date(b.updatedAt!)?.getTime?.();
                return bDate - aDate;
              })
              .map((form) => (
                <SidebarMenuSubItem key={form.id}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      className={`${pathname.includes(`/forms/${form.id}`) ? "bg-primary/5" : ""}`}
                      href={`/forms/${form.id}/${form.isPublished ? "share" : "edit"}`}
                      onClick={invalidateFormCache}
                    >
                      <span>{form.name}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};
