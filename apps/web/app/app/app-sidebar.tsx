"use client";
import * as React from "react";
import { ContactRound, Home, Settings, Workflow } from "lucide-react";
import { NavMain } from "@/app/app/nav-main";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Anton } from "next/font/google";

const anton = Anton({
  variable: "--font-anton",
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
        <h1 className="flex w-full justify-center pb-8 pt-4">
          <span
            className={`w-full truncate text-center text-3xl font-black ${anton.className}`}
          >
            formlect
          </span>
        </h1>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  );
}
