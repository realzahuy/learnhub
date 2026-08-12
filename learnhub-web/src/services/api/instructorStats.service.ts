import apiClient from './config';
import {
  InstructorOverview,
  InstructorTimeSeries,
  StatsGranularity,
} from '../../types/stats.types';

export const instructorStatsService = {
  getOverview: async (): Promise<InstructorOverview> => {
    const response = await apiClient.get<InstructorOverview>('/instructor/stats/overview');
    return response.data;
  },

  getTimeSeries: async (
    groupBy: StatsGranularity,
    from?: string,
    to?: string
  ): Promise<InstructorTimeSeries> => {
    const params = new URLSearchParams({ groupBy });
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    }

    const response = await apiClient.get<InstructorTimeSeries>(
      `/instructor/stats/timeseries?${params.toString()}`
    );
    return response.data;
  },
};
