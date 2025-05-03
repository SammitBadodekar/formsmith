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
import { getForms } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Form } from "@formsmith/database";

const DynamicBreadcrumb = () => {
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: ["getForms"],
    queryFn: getForms,
  });

  const generateBreadcrumbs = () => {
    const pathWithoutSlashes = pathname.replace(/^\/|\/$/g, "");
    const segments = pathWithoutSlashes.split("/");

    if (pathname.includes("forms")) {
      const formId = segments[1];
      const form = data?.data?.forms.find((form: Form) => form.id === formId);
      const workspace = data?.data?.workspaces.find(
        (workspace: any) => workspace.id === form?.workspaceId,
      );

      console.log("forms", { form, workspace }, data?.data?.forms, formId);
      return [
        {
          href: `/`,
          text: workspace?.name,
        },
        {
          href: `/forms/${formId}/edit`,
          text: form?.name,
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
    <Breadcrumb>
      <BreadcrumbList>
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
                <Link href={breadcrumb.href}>{breadcrumb.text}</Link>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default DynamicBreadcrumb;
