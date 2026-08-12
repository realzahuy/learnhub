import apiClient from './config';
import { AdminOverview, AdminTimeSeries, StatsGranularity } from '../../types/stats.types';

export const adminStatsService = {
  getOverview: async (): Promise<AdminOverview> => {
    const response = await apiClient.get<AdminOverview>('/admin/stats/overview');
    return response.data;
  },

  getTimeSeries: async (
    groupBy: StatsGranularity,
    from?: string,
    to?: string
  ): Promise<AdminTimeSeries> => {
    const params = new URLSearchParams({ groupBy });
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    }

    const response = await apiClient.get<AdminTimeSeries>(
      `/admin/stats/timeseries?${params.toString()}`
    );
    return response.data;
  },
};
