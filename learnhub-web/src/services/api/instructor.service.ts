import apiClient from './config';
import {
  InstructorCourse,
  InstructorCourseQueryParams,
  CourseRejectReason,
  CourseUpdatePayload,
  CourseCreatePayload,
  CourseCreatedResponse,
} from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import type { InstructorCourseContent } from '../../types/lesson.types';

export const instructorService = {

  getMyCourses: async (
    params: InstructorCourseQueryParams = {},
    signal?: AbortSignal
  ): Promise<PageResponse<InstructorCourse>> => {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);

    const response = await apiClient.get<PageResponse<InstructorCourse>>(
      `/instructor/courses?${queryParams.toString()}`,
      { signal }
    );
    return response.data;
  },

  createDraftCourse: async (payload: CourseCreatePayload): Promise<CourseCreatedResponse> => {
    const formData = new FormData();
    formData.append('title', payload.title);
    if (payload.slug) {
      formData.append('slug', payload.slug);
    }
    formData.append('shortDescription', payload.shortDescription);
    formData.append('description', payload.description);
    formData.append('price', payload.price.toString());
    formData.append('categoryId', payload.categoryId.toString());
    if (payload.thumbnailFile) {
      formData.append('thumbnailFile', payload.thumbnailFile);
    }

    const response = await apiClient.post<CourseCreatedResponse>(
      '/instructor/courses',
      formData,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  getCourseDetail: async (id: number, signal?: AbortSignal): Promise<InstructorCourse> => {
    const response = await apiClient.get<InstructorCourse>(`/instructor/courses/${id}`, { signal });
    return response.data;
  },

  getCourseContent: async (
    id: number,
    signal?: AbortSignal
  ): Promise<InstructorCourseContent> => {
    const response = await apiClient.get<InstructorCourseContent>(
      `/instructor/courses/${id}/content`,
      { signal }
    );
    return response.data;
  },

  getRejectReason: async (id: number, signal?: AbortSignal): Promise<CourseRejectReason> => {
    const response = await apiClient.get<CourseRejectReason>(
      `/instructor/courses/${id}/reject-reason`,
      { signal }
    );
    return response.data;
  },

  updateCourse: async (
    id: number,
    payload: CourseUpdatePayload
  ): Promise<InstructorCourse> => {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('slug', payload.slug);
    formData.append('shortDescription', payload.shortDescription);
    formData.append('description', payload.description);
    formData.append('price', payload.price.toString());
    formData.append('categoryId', payload.categoryId.toString());

    if (payload.thumbnail) {
      formData.append('thumbnail', payload.thumbnail);
    }
    if (payload.thumbnailFile) {
      formData.append('thumbnailFile', payload.thumbnailFile);
    }

    const response = await apiClient.put<InstructorCourse>(
      `/instructor/courses/${id}`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  submitCourse: async (id: number): Promise<void> => {
    await apiClient.post(`/instructor/courses/${id}/submit`);
  },

  deleteCourse: async (id: number): Promise<void> => {
    await apiClient.delete(`/instructor/courses/${id}`);
  },
};
