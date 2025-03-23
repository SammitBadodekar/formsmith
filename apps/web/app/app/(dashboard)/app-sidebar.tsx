"use client";
import * as React from "react";
import { ContactRound, Home, Settings, Workflow } from "lucide-react";
import { NavMain } from "@/app/app/(dashboard)/nav-main";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Dangrek } from "next/font/google";
import Image from "next/image";
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
      title: "Contacts",
      url: "/contacts",
      icon: ContactRound,
    },
    {
      title: "Automations",
      url: "/automations",
      icon: Workflow,
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
        <div className="pb-4">
          <NavUser />
        </div>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  );
}
