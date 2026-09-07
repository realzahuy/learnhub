import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningService } from '../services/api/learning.service';
import { LearnCourse, Viewing } from '../types/learn.types';
import { getApiErrorMessage } from '../utils';
import { queryKeys } from '../query/queryKeys';

interface LearningCourseState {
  course: LearnCourse | null;
  viewing: Viewing | null;
  loading: boolean;
  error: string | null;
}

export const useLearningCourse = (
  enabled: boolean,
  slug?: string,
  videoId?: string,
  quizLessonId?: string
): LearningCourseState => {
  const courseQuery = useQuery<LearnCourse>({
    queryKey: queryKeys.learningCourses.detail(slug),
    enabled: enabled && Boolean(slug),
    queryFn: ({ signal }) => learningService.getCourseBySlug(slug!, signal),
  });
  const course = enabled ? courseQuery.data ?? null : null;

  const viewing = useMemo<Viewing | null>(() => {
    if (!enabled || !course || !slug) return null;

    const wantedQuiz = quizLessonId ? Number(quizLessonId) : null;
    const quizLesson = Number.isFinite(wantedQuiz)
      ? course.lessons.find(
          (lesson) => lesson.id === wantedQuiz && lesson.questionCount > 0
        )
      : null;
    if (quizLesson) {
      return { kind: 'quiz', lessonId: quizLesson.id };
    }

    const wantedVideo = videoId ? Number(videoId) : null;
    if (Number.isFinite(wantedVideo)) {
      for (const lesson of course.lessons) {
        const video = lesson.videos.find(
          (item) => item.id === wantedVideo && item.playbackUrl
        );
        if (video) {
          return { kind: 'video', lessonId: lesson.id, video };
        }
      }
    }

    return null;
  }, [course, enabled, quizLessonId, slug, videoId]);

  const loading = enabled && Boolean(slug) && courseQuery.isPending;
  const error = courseQuery.error && !course
    ? getApiErrorMessage(courseQuery.error, 'Không mở được khóa học này.')
    : null;

  return { course, viewing, loading, error };
};
