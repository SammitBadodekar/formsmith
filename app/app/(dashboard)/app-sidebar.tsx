"use client";
import * as React from "react";
import { Globe, Home, Search, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NavWorkspaces } from "./nav-workspaces";
import { NavMain } from "./nav-main";

const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
      isActive: false,
    },
    {
      title: "Search",
      url: "/search",
      icon: Search,
    },
    {
      title: "Domains",
      url: "/domains",
      icon: Globe,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader className="p-0">
        <div className="pb-2">
          <NavUser />
        </div>
      </SidebarHeader>{" "}
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavWorkspaces />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
