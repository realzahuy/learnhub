import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { StatsFilterValue } from '../components/features/stats';
import { StatsGranularity } from '../types/stats.types';
import { getApiErrorMessage } from '../utils';

interface StatsDataSource<Overview, TimeSeries> {
  getOverview: (signal?: AbortSignal) => Promise<Overview>;
  getTimeSeries: (
    groupBy: StatsGranularity,
    from?: string,
    to?: string,
    signal?: AbortSignal
  ) => Promise<TimeSeries>;
}

interface UseStatsDashboardOptions<Overview, TimeSeries> {
  dataSource: StatsDataSource<Overview, TimeSeries>;
  queryScope: string;
}

export const useStatsDashboard = <
  Overview,
  TimeSeries,
  Metric extends string,
>({
  dataSource,
  queryScope,
}: UseStatsDashboardOptions<Overview, TimeSeries>) => {
  const [applied, setApplied] = useState<StatsFilterValue<Metric> | null>(null);
  const hasAppliedFilter = Boolean(applied && applied.metric !== '');
  const groupBy = applied?.groupBy ?? 'day';
  const from = applied?.from || undefined;
  const to = applied?.to || undefined;

  const overviewQuery = useQuery<Overview>({
    queryKey: ['stats-dashboard', queryScope, 'overview'],
    queryFn: ({ signal }) => dataSource.getOverview(signal),
  });

  const seriesQuery = useQuery<TimeSeries>({
    queryKey: ['stats-dashboard', queryScope, 'timeseries', groupBy, from, to],
    enabled: hasAppliedFilter,
    queryFn: ({ signal }) => dataSource.getTimeSeries(groupBy, from, to, signal),
  });

  const overview = overviewQuery.data ?? null;
  const series = hasAppliedFilter ? seriesQuery.data ?? null : null;
  const loadingOverview = overviewQuery.isPending;
  const loadingSeries = hasAppliedFilter && seriesQuery.isFetching;
  const queryError = overviewQuery.error ?? seriesQuery.error;
  const error = queryError
    ? getApiErrorMessage(queryError, 'Không tải được số liệu thống kê.')
    : null;

  return {
    overview,
    series,
    applied,
    setApplied,
    loadingOverview,
    loadingSeries,
    error,
  };
};
