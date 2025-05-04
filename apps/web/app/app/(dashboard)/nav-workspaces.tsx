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
import { useQuery } from "@tanstack/react-query";
import { getWorkspaces } from "@/lib/queries";
import { Form, Workspace } from "@formsmith/database";
import WorkspacesLoading from "@/components/skeletons/workspaces-loading";
import { useState } from "react";
import Link from "next/link";
import CreateForm from "@/components/modals/create-form";

type WorkspaceWithForms = Workspace & { forms: Form[] };

export function NavWorkspaces() {
  const { data, isLoading } = useQuery({
    queryKey: ["getWorkspaces"],
    queryFn: getWorkspaces,
    staleTime: 60000,
  });
  const workspaces = data?.data?.workspaces ?? [];
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
              <WorkspaceItem workspace={workspace} index={index} />
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
            {workspace.forms.map((form) => (
              <SidebarMenuSubItem key={form.name}>
                <SidebarMenuSubButton asChild>
                  <Link href="">
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
