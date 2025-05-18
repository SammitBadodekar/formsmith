import { getForm } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";

export const useFormQuery = ({ formId }: { formId: string }) => {
  const formQuery = useQuery({
    queryKey: ["getForm", formId] as const,
    queryFn: ({ queryKey: [, id] }) => getForm(id),
    staleTime: 0,
  });
  return formQuery;
};
