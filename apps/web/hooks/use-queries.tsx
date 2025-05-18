import {
  getForm,
  getForms,
  getPublishedForm,
  getWorkspaces,
} from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";

export const useFormQuery = ({ formId }: { formId: string }) => {
  const formQuery = useQuery({
    queryKey: ["getForm", formId] as const,
    queryFn: ({ queryKey: [, id] }) => getForm(id),
    staleTime: 0,
  });
  return formQuery;
};

export const useGetFormsQuery = () => {
  const formsQuery = useQuery({
    queryKey: ["getForms"],
    queryFn: getForms,
    staleTime: 60000,
  });
  return formsQuery;
};

export const useGetWorkspacesQuery = () => {
  const workspacesQuery = useQuery({
    queryKey: ["getWorkspaces"],
    queryFn: getWorkspaces,
    staleTime: 60000,
  });
  return workspacesQuery;
};

export const useGetPublishedFormQuery = ({
  domain,
  path,
}: {
  domain: string;
  path: string;
}) => {
  const publishedFormQuery = useQuery({
    queryKey: ["getPublishedForm"],
    queryFn: ({ queryKey: [] }) => getPublishedForm(domain, path),
    staleTime: 60000,
  });
  return publishedFormQuery;
};
