"use client";
import * as React from "react";
import { Globe, Home, Search, Settings } from "lucide-react";
import { NavMain } from "./nav-main";
import { Sidebar, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NavWorkspaces } from "./nav-workspaces";

const data = {
  navMain: [
    {
      title: "Home",
      url: "/dashboard",
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
    <Sidebar className="border-r-0 min-w-[200px]" {...props}>
      <SidebarHeader className="p-0">
        <div className="pb-2">
          <NavUser />
        </div>
        <NavMain items={data.navMain} />
        <NavWorkspaces />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  );
}
