"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useInvalidateFormCache } from "./use-invalidate-cache";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const pathName = usePathname();
  const { invalidateFormCache } = useInvalidateFormCache();
  const { toggleSidebar, isMobile } = useSidebar();
  return (
    <SidebarMenu className="p-2">
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={
              item.url === "/"
                ? pathName === item.url
                : pathName?.includes(item.url)
            }
            className="text-base"
            onClick={() => {
              if (isMobile) {
                toggleSidebar();
              }
            }}
          >
            <Link href={item.url} onClick={invalidateFormCache}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
