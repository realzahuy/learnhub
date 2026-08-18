import apiClient from './config';
import { Course, CourseDetail, CourseQueryParams } from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';

export const courseService = {

  getPublishedCourses: async (
    params: CourseQueryParams = {},
    signal?: AbortSignal
  ): Promise<PageResponse<Course>> => {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await apiClient.get<PageResponse<Course>>(
      `/courses?${queryParams.toString()}`,
      { signal }
    );
    return response.data;
  },

  getCourseBySlug: async (slug: string, signal?: AbortSignal): Promise<CourseDetail> => {
    const response = await apiClient.get<CourseDetail>(`/courses/${slug}`, { signal });
    return response.data;
  }
};
