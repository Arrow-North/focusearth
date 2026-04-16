import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  offset: number;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

export function usePagination(defaultPageSize = 20): UsePaginationReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    [],
  );

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    offset,
    nextPage,
    prevPage,
    resetPage,
  };
}
