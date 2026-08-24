import apiClient from './config';
import {
  InstructorOverview,
  InstructorTimeSeries,
  StatsGranularity,
} from '../../types/stats.types';

export const instructorStatsService = {
  getOverview: async (signal?: AbortSignal): Promise<InstructorOverview> => {
    const response = await apiClient.get<InstructorOverview>('/instructor/stats/overview', {
      signal,
    });
    return response.data;
  },

  getTimeSeries: async (
    groupBy: StatsGranularity,
    from?: string,
    to?: string,
    signal?: AbortSignal
  ): Promise<InstructorTimeSeries> => {
    const params = new URLSearchParams({ groupBy });
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    }

    const response = await apiClient.get<InstructorTimeSeries>(
      `/instructor/stats/timeseries?${params.toString()}`,
      { signal }
    );
    return response.data;
  },
};
