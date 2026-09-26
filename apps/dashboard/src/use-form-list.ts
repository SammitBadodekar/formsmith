import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formListQuery } from "./queries";

export function useFormList(enabled: boolean, search: string) {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), search ? 200 : 0);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({ ...formListQuery(debounced), enabled });
  const searching = search !== debounced;
  return {
    forms: searching ? [] : (query.data?.pages.flatMap((page) => page.items) ?? []),
    nextCursor: searching ? null : (query.data?.pages.at(-1)?.nextCursor ?? null),
    loading: enabled && (searching || query.isPending || query.isFetchingNextPage),
    error: searching ? "" : (query.error?.message ?? ""),
    loadMore: () => !query.isFetching && query.fetchNextPage(),
    retry: () => void query.refetch(),
  };
}
