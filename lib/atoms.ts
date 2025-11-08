import { atom } from "jotai";
import {
  defaultFormCustomizations,
  FormCustomizations,
} from "@/lib/shared";
import { Form, Workspace } from "@/lib/db/schema";

export const formCustomizationAtom = atom<FormCustomizations>({
  ...defaultFormCustomizations,
});

// Dashboard data atoms
type WorkspaceWithForms = Workspace & { forms: Form[] };

export const dashboardFormsAtom = atom<Form[]>([]);
export const dashboardWorkspacesAtom = atom<WorkspaceWithForms[]>([]);
