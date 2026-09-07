export const uiConfig = {
  pagination: {
    coursePageSize: 12,
    reviewPageSize: 5,
    notificationHistoryPageSize: 12,
  },
  notification: {
    visibleStep: 3,
    sseReconnectInitialMs: 1_000,
    sseReconnectMaxMs: 30_000,
  },
  video: {
    statusPollMs: 30_000,
    sseReconnectInitialMs: 1_000,
    sseReconnectMaxMs: 15_000,
    progressFlushMs: 300,
    uploadProgressUpdateMs: 200,
    statusBatchSize: 50,
  },
  stats: {
    maxDayBuckets: 90,
    maxMonthBuckets: 120,
    maxQuarterBuckets: 40,
  },
  payment: {
    momoPollMs: 2_000,
    momoMaxPollAttempts: 12,
  },
  query: {
    retryCount: 1,
    staleMs: 30_000,
    gcMs: 300_000,
    refetchOnWindowFocus: false,
  },
  timing: {
    searchDebounceMs: 500,
    realtimeRefreshCoalesceMs: 150,
    toastDurationMs: 3_000,
    topLoadingShowDelayMs: 90,
    topLoadingCompleteMs: 180,
    routeTransitionMs: 190,
    authRefreshSettleMs: 75,
  },
  formatting: {
    locale: 'vi-VN',
    currency: 'VND',
  },
} as const;
