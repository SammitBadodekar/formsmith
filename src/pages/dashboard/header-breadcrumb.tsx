"use client";

import React from "react";
import { Link, useLocation } from "react-router";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const DynamicBreadcrumb = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const generateBreadcrumbs = (): {
    href: string;
    text: string;
    onClick?: () => void;
  }[] => {
    const pathWithoutSlashes = pathname.replace(/^\/|\/$/g, "");
    const segments = pathWithoutSlashes.split("/");

    if (pathname.includes("forms")) {
      // const formId = segments[1];
      // const form = data?.data?.forms.find((form: Form) => form.id === formId);
      // const workspace = workspaceData?.data?.workspaces.find(
      //   (workspace: any) => workspace.id === form?.workspaceId,
      // );

      return [
        {
          href: `/`,
          text: "example",
        },
        {
          href: `/forms/test/edit`,
          text: "test",
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
    <div className="z-40 flex w-full items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList className="flex w-full items-center gap-2">
          <BreadcrumbItem>
            <Link to="/" className="flex items-center">
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
                    to={breadcrumb.href}
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
