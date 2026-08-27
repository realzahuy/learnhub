import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from './useDebouncedCallback';

interface SetParamOptions {
  resetPage?: boolean;
  replace?: boolean;
}

const parsePage = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const usePagedSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const page = parsePage(searchParams.get('page'));
  const [searchInput, setSearchInput] = useState(search);

  const setParam = useCallback(
    (key: string, value: string, options: SetParamOptions = {}) => {
      const { resetPage = key !== 'page', replace = false } = options;

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set(key, value);
          else next.delete(key);

          if (resetPage) next.set('page', '0');
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const [commitSearch, cancelPendingSearch] =
    useDebouncedCallback((value: string) => setParam('search', value.trim(), { replace: true }));

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
      setParam('page', Math.max(0, nextPage).toString(), {
        resetPage: false,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [cancelPendingSearch, setParam]
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
