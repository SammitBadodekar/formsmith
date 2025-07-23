"use client";
import { ChevronRight, Plus } from "lucide-react";
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
import WorkspacesLoading from "@/components/skeletons/workspaces-loading";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import CreateForm from "@/components/modals/create-form";

export function NavWorkspaces() {
  const workspaces: any[] = [];
  let isLoading = false;
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-semibold">
        Workspaces
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading && <WorkspacesLoading />}
          {!isLoading &&
            workspaces.map((workspace: any, index: number) => (
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
  workspace: any;
  index: number;
}) => {
  const [open, setOpen] = useState(index === 0);
  const location = useLocation();
  const pathname = location.pathname;
  return (
    <Collapsible key={workspace.name} open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="pl-8">
          <Link to="">
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
              .sort((a: any, b: any) => {
                const aDate = new Date(a.updatedAt!)?.getTime?.();
                const bDate = new Date(b.updatedAt!)?.getTime?.();
                return bDate - aDate;
              })
              .map((form: any) => (
                <SidebarMenuSubItem key={form.id}>
                  <SidebarMenuSubButton asChild>
                    <Link
                      to={`/forms/${form.id}/${form.isPublished ? "share" : "edit"}`}
                      className={`${pathname.includes(`/forms/${form.id}`) ? "bg-primary/5" : ""}`}
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
