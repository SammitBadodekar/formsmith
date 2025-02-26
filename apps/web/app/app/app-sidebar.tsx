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
import { Dangrek } from "next/font/google";
import Image from "next/image";

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
        <h1 className="flex w-full justify-center pb-8 pt-4">
          <span
            className={`w-full flex truncate text-3xl font-black px-2 ${dangrek.className}`}
          >
            Formlect
          </span>
        </h1>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarRail />
    </Sidebar>
  );
}
