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
    params: InstructorCourseQueryParams = {}
  ): Promise<PageResponse<InstructorCourse>> => {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.category) queryParams.append('category', params.category);
    if (params.search) queryParams.append('search', params.search);

    const response = await apiClient.get<PageResponse<InstructorCourse>>(
      `/instructor/courses?${queryParams.toString()}`
    );
    return response.data;
  },

  createDraftCourse: async (payload: CourseCreatePayload): Promise<CourseCreatedResponse> => {
    const response = await apiClient.post<CourseCreatedResponse>(
      '/instructor/courses?status=DRAFT',
      payload
    );
    return response.data;
  },

  getCourseDetail: async (id: number): Promise<InstructorCourse> => {
    const response = await apiClient.get<InstructorCourse>(`/instructor/courses/${id}`);
    return response.data;
  },

  getCourseContent: async (id: number): Promise<InstructorCourseContent> => {
    const response = await apiClient.get<InstructorCourseContent>(
      `/instructor/courses/${id}/content`
    );
    return response.data;
  },

  getRejectReason: async (id: number): Promise<CourseRejectReason> => {
    const response = await apiClient.get<CourseRejectReason>(`/instructor/courses/${id}/reject-reason`);
    return response.data;
  },

  updateCourse: async (
    id: number,
    payload: CourseUpdatePayload,
    submit = false
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
      `/instructor/courses/${id}?submit=${submit}`,
      formData,
      { headers: { 'Content-Type': undefined } }
    );
    return response.data;
  },

  deleteCourse: async (id: number): Promise<void> => {
    await apiClient.delete(`/instructor/courses/${id}`);
  },
};
