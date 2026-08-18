import apiClient from './config';
import { LearnCourse, LessonProgressStatus } from '../../types/learn.types';
import { Course } from '../../types/course.types';
import { Quiz, QuizResult, QuizSubmission } from '../../types/quiz.types';

export const learningService = {

  getCourseBySlug: async (slug: string): Promise<LearnCourse> => {
    const response = await apiClient.get<LearnCourse>(`/learn/courses/by-slug/${slug}`);
    return response.data;
  },

  getRecommendations: async (courseId: number): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>(
      `/learn/courses/${courseId}/recommendations`
    );
    return response.data;
  },

  setLessonCompleted: async (lessonId: number, completed: boolean): Promise<boolean> => {
    const response = await apiClient.put<LessonProgressStatus>(
      `/learn/lessons/${lessonId}/progress`,
      { completed }
    );
    return response.data.completed;
  },

  markLessonVideoCompleted: async (lessonId: number): Promise<LessonProgressStatus> => {
    const response = await apiClient.put<LessonProgressStatus>(
      `/learn/lessons/${lessonId}/video-completed`
    );
    return response.data;
  },

  getQuiz: async (lessonId: number): Promise<Quiz> => {
    const response = await apiClient.get<Quiz>(`/learn/lessons/${lessonId}/quiz`);
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
