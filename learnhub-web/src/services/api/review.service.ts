import apiClient from './config';
import { PageResponse } from '../../types/pagination.types';
import {
  RatingSummary,
  Review,
  ReviewPayload,
} from '../../types/review.types';

export const reviewService = {

  getCourseReviews: async (
    slug: string,
    page = 0,
    size?: number,
    signal?: AbortSignal
  ): Promise<PageResponse<Review>> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    if (size !== undefined) queryParams.append('size', size.toString());

    const response = await apiClient.get<PageResponse<Review>>(
      `/courses/${slug}/reviews?${queryParams.toString()}`,
      { signal, showTopProgress: false }
    );
    return response.data;
  },

  getCourseSummary: async (slug: string, signal?: AbortSignal): Promise<RatingSummary> => {
    const response = await apiClient.get<RatingSummary>(`/courses/${slug}/reviews/summary`, {
      signal,
      showTopProgress: false,
    });
    return response.data;
  },

  getMyReview: async (slug: string, signal?: AbortSignal): Promise<Review | null> => {
    const response = await apiClient.get<Review>(`/courses/${slug}/reviews/me`, {
      signal,
      showTopProgress: false,
    });
    return response.status === 204 ? null : response.data;
  },

  saveReview: async (slug: string, payload: ReviewPayload): Promise<Review> => {
    const response = await apiClient.post<Review>(`/courses/${slug}/reviews`, payload);
    return response.data;
  },

  deleteMyReview: async (slug: string): Promise<void> => {
    await apiClient.delete(`/courses/${slug}/reviews/me`);
  },

};
