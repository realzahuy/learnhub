import apiClient from './config';
import { LearnCourse } from '../../types/learn.types';
import { RecommendationCard } from '../../types/course.types';
import { Quiz, QuizResult, QuizSubmission } from '../../types/quiz.types';

export const learningService = {

  getCourseBySlug: async (slug: string, signal?: AbortSignal): Promise<LearnCourse> => {
    const response = await apiClient.get<LearnCourse>(`/learn/courses/by-slug/${slug}`, {
      signal,
    });
    return response.data;
  },

  getRecommendations: async (
    courseId: number,
    signal?: AbortSignal
  ): Promise<RecommendationCard[]> => {
    const response = await apiClient.get<RecommendationCard[]>(
      `/learn/courses/${courseId}/recommendations`,
      { signal }
    );
    return response.data;
  },

  getQuiz: async (lessonId: number, signal?: AbortSignal): Promise<Quiz> => {
    const response = await apiClient.get<Quiz>(`/learn/lessons/${lessonId}/quiz`, {
      signal,
    });
    return response.data;
  },

  submitQuiz: async (lessonId: number, submission: QuizSubmission): Promise<QuizResult> => {
    const response = await apiClient.post<QuizResult>(
      `/learn/lessons/${lessonId}/quiz/submit`,
      submission
    );
    return response.data;
  },
};
