import { useQueryClient } from "@tanstack/react-query";

export const useInvalidateFormCache = () => {
  const queryClient = useQueryClient();

  const invalidateFormCache = () => {
    queryClient.invalidateQueries({
      queryKey: ["getForm"] as const,
    });
  };
  return { invalidateFormCache };
};
