import apiClient from './config';
import {
  Question,
  QuestionPayload,
  QuestionReorderPayload,
} from '../../types/question.types';

const lessonQuestions = (lessonId: number) => `/instructor/lessons/${lessonId}/questions`;
const question = (questionId: number) => `/instructor/questions/${questionId}`;

export const questionService = {
  create: async (
    lessonId: number,
    payload: QuestionPayload
  ): Promise<Question> => {
    const response = await apiClient.post<Question>(lessonQuestions(lessonId), payload);
    return response.data;
  },

  update: async (
    questionId: number,
    payload: QuestionPayload
  ): Promise<Question> => {
    const response = await apiClient.put<Question>(question(questionId), payload);
    return response.data;
  },

  reorder: async (
    lessonId: number,
    payloads: QuestionReorderPayload[]
  ): Promise<Question[]> => {
    const response = await apiClient.put<Question[]>(
      `${lessonQuestions(lessonId)}/reorder`,
      payloads
    );
    return response.data;
  },

  remove: async (questionId: number): Promise<void> => {
    await apiClient.delete(question(questionId));
  },
};
