import { infiniteQueryOptions, QueryClient, queryOptions } from "@tanstack/react-query";
import { ApiError, api, type FormRecord, type FormSummary, type Page } from "./api";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (count, error) =>
          count < 1 &&
          (!(error instanceof ApiError) || error.status === 429 || error.status >= 500),
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}

export function resourceQuery<T>(path: string) {
  return queryOptions({
    queryKey: ["api", path],
    queryFn: ({ signal }) => api<T>(path, { signal }),
  });
}

export const formQuery = (id: string) => ({
  ...resourceQuery<FormRecord>(`/forms/${id}`),
  staleTime: 10_000,
});

export function formListQuery(search: string) {
  return infiniteQueryOptions({
    queryKey: ["forms", "list", search],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ search });
      if (pageParam) params.set("cursor", pageParam);
      return api<Page<FormSummary>>(`/forms?${params}`, { signal });
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function cacheSavedForm(client: QueryClient, record: FormRecord) {
  client.setQueryData(formQuery(record.id).queryKey, record);
  // Search membership and ordering can change on a save, creation or publication.
  void client.invalidateQueries({ queryKey: ["forms", "list"] });
}
