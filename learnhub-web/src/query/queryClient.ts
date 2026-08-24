import { QueryClient } from '@tanstack/react-query';
import { uiConfig } from '../config/uiConfig';

const shouldRetryQuery = (failureCount: number, error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }
  return failureCount < uiConfig.query.retryCount;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: uiConfig.query.staleMs,
      gcTime: uiConfig.query.gcMs,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: uiConfig.query.refetchOnWindowFocus,
    },
  },
});
