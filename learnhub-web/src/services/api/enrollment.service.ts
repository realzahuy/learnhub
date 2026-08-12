import apiClient from './config';
import { Enrollment } from '../../types/enrollment.types';
import { PageResponse } from '../../types/pagination.types';

export const enrollmentService = {

  list: async (params?: { page?: number; size?: number }): Promise<PageResponse<Enrollment>> => {
    const response = await apiClient.get<PageResponse<Enrollment>>('/enrollments', { params });
    return response.data;
  },

  checkEnrolled: async (courseId: number): Promise<boolean> => {
    const response = await apiClient.get<{ enrolled: boolean }>('/enrollments/check', {
      params: { courseId },
    });
    return response.data.enrolled;
  },
};
