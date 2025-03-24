"use client";
import * as React from "react";
import { Globe, Home, Search, Settings } from "lucide-react";
import { NavMain } from "@/app/app/(dashboard)/nav-main";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Dangrek } from "next/font/google";
import { NavUser } from "./nav-user";

const dangrek = Dangrek({
  variable: "--font-dangrek",
  subsets: ["latin"],
  weight: ["400"],
});

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
      <SidebarHeader>
        <div className="pb-2">
          <NavUser />
        </div>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  );
}
