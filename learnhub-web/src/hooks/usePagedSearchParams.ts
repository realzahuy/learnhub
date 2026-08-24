import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uiConfig } from '../config/uiConfig';
import { useDebouncedCallback } from './useDebouncedCallback';

interface SetParamOptions {
  resetPage?: boolean;
  replace?: boolean;
}

interface UsePagedSearchParamsOptions {
  debounceMs?: number;
  pageParam?: string;
  searchParam?: string;
}

const parsePage = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const usePagedSearchParams = ({
  debounceMs = uiConfig.timing.searchDebounceMs,
  pageParam = 'page',
  searchParam = 'search',
}: UsePagedSearchParamsOptions = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get(searchParam) ?? '';
  const page = parsePage(searchParams.get(pageParam));
  const [searchInput, setSearchInput] = useState(search);

  const setParam = useCallback(
    (key: string, value: string, options: SetParamOptions = {}) => {
      const { resetPage = key !== pageParam, replace = false } = options;

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(key, value);
          else next.delete(key);

          if (resetPage) next.set(pageParam, '0');
          return next;
        },
        { replace }
      );
    },
    [pageParam, setSearchParams]
  );

  const [commitSearch, cancelPendingSearch] = useDebouncedCallback(
    (value: string) => setParam(searchParam, value.trim(), { replace: true }),
    debounceMs
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      commitSearch(value);
    },
    [commitSearch]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      cancelPendingSearch();
      setParam(pageParam, Math.max(0, nextPage).toString(), {
        resetPage: false,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [cancelPendingSearch, pageParam, setParam]
  );

  useEffect(() => {
    cancelPendingSearch();
    setSearchInput(search);
  }, [cancelPendingSearch, search]);

  return {
    searchParams,
    page,
    search,
    searchInput,
    setParam,
    setPage,
    setSearch,
  };
};
