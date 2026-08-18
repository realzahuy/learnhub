import apiClient from './config';
import { Enrollment } from '../../types/enrollment.types';
import { PageResponse } from '../../types/pagination.types';

export interface FreeEnrollmentResponse {
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: string;
  message: string;
}

export const enrollmentService = {

  list: async (params?: {
    page?: number;
    size?: number;
    category?: string;
    search?: string;
  }): Promise<PageResponse<Enrollment>> => {
    const response = await apiClient.get<PageResponse<Enrollment>>('/enrollments', { params });
    return response.data;
  },

  checkEnrolled: async (courseId: number): Promise<boolean> => {
    const response = await apiClient.get<{ enrolled: boolean }>('/enrollments/check', {
      params: { courseId },
      showTopProgress: false,
    });
    return response.data.enrolled;
  },

  checkEnrolledBatch: async (courseIds: number[]): Promise<number[]> => {
    const response = await apiClient.post<{ enrolledCourseIds: number[] }>(
      '/enrollments/check-batch',
      { courseIds },
      { showTopProgress: false }
    );
    return response.data.enrolledCourseIds;
  },

  enrollFree: async (courseId: number): Promise<FreeEnrollmentResponse> => {
    const response = await apiClient.post<FreeEnrollmentResponse>(
      `/enrollments/free/${courseId}`
    );
    return response.data;
  },
};
