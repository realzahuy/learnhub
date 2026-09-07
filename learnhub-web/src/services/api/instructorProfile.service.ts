import apiClient from './config';
import type { Course } from '../../types/course.types';
import type { InstructorProfile } from '../../types/instructor.types';
import type { PageResponse } from '../../types/pagination.types';

export const instructorProfileService = {
  getProfile: async (
    instructorId: number,
    signal?: AbortSignal
  ): Promise<InstructorProfile> => {
    const response = await apiClient.get<InstructorProfile>(
      `/instructors/${instructorId}`,
      { signal, showTopProgress: false }
    );
    return response.data;
  },

  getCourses: async (
    instructorId: number,
    page = 0,
    signal?: AbortSignal
  ): Promise<PageResponse<Course>> => {
    const response = await apiClient.get<PageResponse<Course>>(
      `/instructors/${instructorId}/courses`,
      { params: { page }, signal, showTopProgress: false }
    );
    return response.data;
  },
};
