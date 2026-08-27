import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { learningService } from '../services/api/learning.service';
import { LearnCourse } from '../types/learn.types';
import { Viewing } from '../components/features/learn';
import { getApiErrorMessage } from '../utils';

interface LearningCourseState {
  course: LearnCourse | null;
  viewing: Viewing | null;
  setViewing: Dispatch<SetStateAction<Viewing | null>>;
  loading: boolean;
  error: string | null;
}

const sameViewing = (current: Viewing | null, next: Viewing | null) => {
  if (current === next) return true;
  if (!current || !next || current.kind !== next.kind) return false;

  if (current.kind === 'quiz' && next.kind === 'quiz') {
    return current.lessonId === next.lessonId;
  }

  return current.kind === 'video'
    && next.kind === 'video'
    && current.lessonId === next.lessonId
    && current.video.id === next.video.id;
};

export const useLearningCourse = (
  enabled: boolean,
  slug?: string,
  videoId?: string,
  quizLessonId?: string
): LearningCourseState => {
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const courseQuery = useQuery<LearnCourse>({
    queryKey: ['learning-course', slug],
    enabled: enabled && Boolean(slug),
    queryFn: ({ signal }) => learningService.getCourseBySlug(slug!, signal),
  });
  const course = enabled ? courseQuery.data ?? null : null;

  useEffect(() => {
    setViewing(null);
  }, [enabled, slug]);

  useEffect(() => {
    if (!enabled || !course || !slug) return;

    const wantedQuiz = quizLessonId ? Number(quizLessonId) : null;
    const quizLesson = Number.isFinite(wantedQuiz)
      ? course.lessons.find(
          (lesson) => lesson.id === wantedQuiz && lesson.questionCount > 0
        )
      : null;
    if (quizLesson) {
      const next: Viewing = { kind: 'quiz', lessonId: quizLesson.id };
      setViewing((current) => (sameViewing(current, next) ? current : next));
      return;
    }

    const wantedVideo = videoId ? Number(videoId) : null;
    if (Number.isFinite(wantedVideo)) {
      for (const lesson of course.lessons) {
        const video = lesson.videos.find(
          (item) => item.id === wantedVideo && item.playbackUrl
        );
        if (video) {
          const next: Viewing = { kind: 'video', lessonId: lesson.id, video };
          setViewing((current) => (sameViewing(current, next) ? current : next));
          return;
        }
      }
    }

    setViewing(null);

  }, [course, enabled, quizLessonId, slug, videoId]);

  const loading = enabled && Boolean(slug) && courseQuery.isPending;
  const error = courseQuery.error && !course
    ? getApiErrorMessage(courseQuery.error, 'Không mở được khóa học này.')
    : null;

  return { course, viewing, setViewing, loading, error };
};
