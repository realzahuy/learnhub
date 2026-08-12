import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { learningService } from '../services/api/learning.service';
import { LearnCourse } from '../types/learn.types';
import { Viewing } from '../components/features/learn';
import { getApiErrorMessage } from '../utils';
import { routeTo } from '../routes/paths';

interface LearningCourseState {
  course: LearnCourse | null;
  setCourse: Dispatch<SetStateAction<LearnCourse | null>>;
  viewing: Viewing | null;
  setViewing: Dispatch<SetStateAction<Viewing | null>>;
  loading: boolean;
  error: string | null;
}

export const useLearningCourse = (
  enabled: boolean,
  slug?: string,
  videoId?: string,
  quizLessonId?: string
): LearningCourseState => {
  const navigate = useNavigate();
  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !slug) return;
    let cancelled = false;
    setCourse(null);
    setViewing(null);
    setLoading(true);
    setError(null);

    learningService.getCourseBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setCourse(data);
        const wantedQuiz = quizLessonId ? Number(quizLessonId) : null;
        const quizLesson = wantedQuiz
          ? data.lessons.find((lesson) => lesson.id === wantedQuiz && lesson.questionCount > 0)
          : null;
        if (quizLesson) {
          setViewing({ kind: 'quiz', lessonId: quizLesson.id });
          return;
        }

        const wantedVideo = videoId ? Number(videoId) : null;
        for (const lesson of data.lessons) {
          const video = wantedVideo
            ? lesson.videos.find((item) => item.id === wantedVideo && item.playbackUrl)
            : undefined;
          if (video) {
            setViewing({ kind: 'video', lessonId: lesson.id, video });
            return;
          }
        }

        for (const lesson of data.lessons) {
          const video = lesson.videos.find((item) => item.playbackUrl);
          if (video) {
            navigate(routeTo.learningLecture(slug, video.id), { replace: true });
            setViewing({ kind: 'video', lessonId: lesson.id, video });
            return;
          }
        }

        const firstQuiz = data.lessons.find((lesson) => lesson.questionCount > 0);
        if (firstQuiz) {
          navigate(routeTo.learningQuiz(slug, firstQuiz.id), { replace: true });
          setViewing({ kind: 'quiz', lessonId: firstQuiz.id });
        }
      })
      .catch((cause) => {
        if (cancelled) return;
        console.error('Không thể tải khóa học để học:', cause);
        setError(getApiErrorMessage(cause, 'Không mở được khóa học này.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };

  }, [enabled, slug, navigate]);

  return { course, setCourse, viewing, setViewing, loading, error };
};
