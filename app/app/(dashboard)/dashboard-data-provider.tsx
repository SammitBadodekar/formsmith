"use client";

import { useHydrateAtoms } from "jotai/utils";
import { dashboardFormsAtom, dashboardWorkspacesAtom } from "@/lib/atoms";
import { Form, Workspace } from "@/lib/db/schema";

type WorkspaceWithForms = Workspace & { forms: Form[] };

export function DashboardDataProvider({
  children,
  forms,
  workspaces,
}: {
  children: React.ReactNode;
  forms: Form[];
  workspaces: WorkspaceWithForms[];
}) {
  useHydrateAtoms([
    [dashboardFormsAtom, forms],
    [dashboardWorkspacesAtom, workspaces],
  ]);

  return <>{children}</>;
}
