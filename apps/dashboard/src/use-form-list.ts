import { useCallback, useEffect, useRef, useState } from "react";
import { api, type FormSummary, type Page } from "./api";

export function useFormList(enabled: boolean, search: string) {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loadedSearch, setLoadedSearch] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry starts a fresh request with unchanged search.
  useEffect(() => {
    const version = ++generation.current;
    setForms([]);
    setNextCursor(null);
    setError("");
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(
      () => {
        api<Page<FormSummary>>(`/forms?${new URLSearchParams({ search })}`)
          .then((page) => {
            if (generation.current === version) {
              setForms(page.items);
              setNextCursor(page.nextCursor);
            }
          })
          .catch((e) => {
            if (generation.current === version) setError(e.message);
          })
          .finally(() => {
            if (generation.current === version) {
              setLoading(false);
              setLoadedSearch(search);
            }
          });
      },
      search ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [enabled, search, attempt]);
  const loadMore = useCallback(async () => {
    if (!nextCursor || pending.current || loading) return;
    const version = generation.current;
    pending.current = true;
    setLoading(true);
    setError("");
    try {
      const page = await api<Page<FormSummary>>(
        `/forms?${new URLSearchParams({ search, cursor: nextCursor })}`,
      );
      if (version === generation.current) {
        setForms((current) => [...current, ...page.items]);
        setNextCursor(page.nextCursor);
      }
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : "Could not load forms");
    } finally {
      pending.current = false;
      if (version === generation.current) setLoading(false);
    }
  }, [search, nextCursor, loading]);
  return {
    forms: loadedSearch === search ? forms : [],
    nextCursor,
    loading: loading || (enabled && loadedSearch !== search),
    error,
    loadMore,
    retry: () => setAttempt((value) => value + 1),
  };
}
