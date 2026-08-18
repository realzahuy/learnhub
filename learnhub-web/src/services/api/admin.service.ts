import apiClient from './config';
import { InstructorCourse } from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import { AdminCourseContent } from '../../types/learn.types';
import { AdminUser, AdminUserFilter } from '../../types/admin.types';

export const adminService = {

  listCourses: async (params: {
    status: string;
    category?: string;
    search?: string;
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<PageResponse<InstructorCourse>> => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    query.append('page', (params.page ?? 0).toString());
    if (params.size !== undefined) query.append('size', params.size.toString());

    const response = await apiClient.get<PageResponse<InstructorCourse>>(
      `/admin/courses?${query.toString()}`,
      { signal }
    );
    return response.data;
  },

  getCourseContent: async (id: number): Promise<AdminCourseContent> => {
    const response = await apiClient.get<AdminCourseContent>(`/admin/courses/${id}/content`);
    return response.data;
  },

  approveCourse: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/courses/${id}/approve`);
  },

  rejectCourse: async (id: number, comment: string): Promise<void> => {
    await apiClient.post(`/admin/courses/${id}/reject`, { comment });
  },

  listUsers: async (params: {
    filter: AdminUserFilter;
    search?: string;
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<PageResponse<AdminUser>> => {
    const query = new URLSearchParams();
    query.append('filter', params.filter);
    if (params.search) query.append('search', params.search);
    query.append('page', (params.page ?? 0).toString());
    if (params.size !== undefined) query.append('size', params.size.toString());

    const response = await apiClient.get<PageResponse<AdminUser>>(
      `/admin/users?${query.toString()}`,
      { signal }
    );
    return response.data;
  },

  lockUser: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/lock`);
  },

  unlockUser: async (id: number): Promise<void> => {
    await apiClient.post(`/admin/users/${id}/unlock`);
  },
};
