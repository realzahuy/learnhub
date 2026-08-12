import apiClient from './config';
import {
  Question,
  QuestionPayload,
  QuestionReorderPayload,
} from '../../types/question.types';

const base = (courseId: number, lessonId: number) =>
  `/instructor/courses/${courseId}/lessons/${lessonId}/questions`;

export const questionService = {
  create: async (
    courseId: number,
    lessonId: number,
    payload: QuestionPayload
  ): Promise<Question> => {
    const response = await apiClient.post<Question>(base(courseId, lessonId), payload);
    return response.data;
  },

  update: async (
    courseId: number,
    lessonId: number,
    questionId: number,
    payload: QuestionPayload
  ): Promise<Question> => {
    const response = await apiClient.put<Question>(
      `${base(courseId, lessonId)}/${questionId}`,
      payload
    );
    return response.data;
  },

  reorder: async (
    courseId: number,
    lessonId: number,
    payloads: QuestionReorderPayload[]
  ): Promise<Question[]> => {
    const response = await apiClient.put<Question[]>(
      `${base(courseId, lessonId)}/reorder`,
      payloads
    );
    return response.data;
  },

  remove: async (courseId: number, lessonId: number, questionId: number): Promise<void> => {
    await apiClient.delete(`${base(courseId, lessonId)}/${questionId}`);
  },
};
