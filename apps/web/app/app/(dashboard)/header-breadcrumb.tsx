"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@formsmith/database";
import { useGetFormsQuery, useGetWorkspacesQuery } from "@/hooks/use-queries";

const DynamicBreadcrumb = () => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data } = useGetFormsQuery();
  const { data: workspaceData } = useGetWorkspacesQuery();

  const generateBreadcrumbs = (): {
    href: string;
    text: string;
    onClick?: () => void;
  }[] => {
    const pathWithoutSlashes = pathname.replace(/^\/|\/$/g, "");
    const segments = pathWithoutSlashes.split("/");

    if (pathname.includes("forms")) {
      const formId = segments[1];
      const form = data?.data?.forms.find((form: Form) => form.id === formId);
      const workspace = workspaceData?.data?.workspaces.find(
        (workspace: any) => workspace.id === form?.workspaceId,
      );

      const invalidateQuery = () => {
        queryClient.invalidateQueries({
          queryKey: ["getForm", formId] as const,
        });
        queryClient.invalidateQueries({ queryKey: ["getForms"] });
      };
      return [
        {
          href: `/`,
          text: workspace?.name,
          onClick: invalidateQuery,
        },
        {
          href: `/forms/${formId}/edit`,
          text: form?.name,
          onClick: invalidateQuery,
        },
      ];
    }
    // Generate array of breadcrumb items
    const breadcrumbs = segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const text = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      return { href, text };
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="flex w-full items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList className="flex w-full items-center gap-2">
          <BreadcrumbItem>
            <Link href="/" className="flex items-center">
              Formsmith
            </Link>
          </BreadcrumbItem>
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={breadcrumb.href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="line-clamp-1">
                    {breadcrumb.text}
                  </BreadcrumbPage>
                ) : (
                  <Link
                    href={breadcrumb.href}
                    onClick={() => breadcrumb?.onClick?.()}
                  >
                    {breadcrumb.text}
                  </Link>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div id="route-header-slot" className="ml-auto" />
    </div>
  );
};

export default DynamicBreadcrumb;
