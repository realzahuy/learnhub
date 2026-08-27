import apiClient from './config';
import { Course } from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import {
  RatingSummary,
  Review,
  ReviewPayload,
  InstructorProfile,
} from '../../types/review.types';

export const reviewService = {

  getCourseReviews: async (
    slug: string,
    page = 0,
    size?: number
  ): Promise<PageResponse<Review>> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (size !== undefined) queryParams.append('size', size.toString());

    const response = await apiClient.get<PageResponse<Review>>(
      `/courses/${slug}/reviews?${queryParams.toString()}`
    );
    return response.data;
  },

  getCourseSummary: async (slug: string): Promise<RatingSummary> => {
    const response = await apiClient.get<RatingSummary>(`/courses/${slug}/reviews/summary`);
    return response.data;
  },

  getMyReview: async (slug: string): Promise<Review | null> => {
    const response = await apiClient.get<Review>(`/courses/${slug}/reviews/me`);
    return response.status === 204 ? null : response.data;
  },

  saveReview: async (slug: string, payload: ReviewPayload): Promise<Review> => {
    const response = await apiClient.post<Review>(`/courses/${slug}/reviews`, payload);
    return response.data;
  },

  deleteMyReview: async (slug: string): Promise<void> => {
    await apiClient.delete(`/courses/${slug}/reviews/me`);
  },

  getInstructorProfile: async (
    instructorId: number,
    signal?: AbortSignal
  ): Promise<InstructorProfile> => {
    const response = await apiClient.get<InstructorProfile>(
      `/instructors/${instructorId}`,
      { signal }
    );
    return response.data;
  },

  getInstructorCourses: async (
    instructorId: number,
    page = 0,
    signal?: AbortSignal
  ): Promise<PageResponse<Course>> => {
    const params = new URLSearchParams({ page: String(page) });
    const response = await apiClient.get<PageResponse<Course>>(
      `/instructors/${instructorId}/courses?${params.toString()}`,
      { signal }
    );
    return response.data;
  },
};
