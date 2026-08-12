import apiClient from './config';
import { Lesson, LessonPayload, LessonReorderPayload } from '../../types/lesson.types';

export const lessonService = {

  create: async (courseId: number, payloads: LessonPayload[]): Promise<Lesson[]> => {
    const response = await apiClient.post<Lesson[]>(
      `/instructor/courses/${courseId}/lessons`,
      payloads
    );
    return response.data;
  },

  update: async (courseId: number, lessonId: number, payload: LessonPayload): Promise<Lesson> => {
    const response = await apiClient.put<Lesson>(
      `/instructor/courses/${courseId}/lessons/${lessonId}`,
      payload
    );
    return response.data;
  },

  reorder: async (courseId: number, payloads: LessonReorderPayload[]): Promise<Lesson[]> => {
    const response = await apiClient.put<Lesson[]>(
      `/instructor/courses/${courseId}/lessons/reorder`,
      payloads
    );
    return response.data;
  },

  remove: async (courseId: number, lessonId: number): Promise<void> => {
    await apiClient.delete(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  },
};
