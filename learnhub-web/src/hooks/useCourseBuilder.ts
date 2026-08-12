import { useCallback, useState } from 'react';
import { InstructorCourseContent, Lesson, LessonKind, Video } from '../types/lesson.types';
import { Question } from '../types/question.types';
import { useVideoProgress } from './useVideoProgress';

export const useCourseBuilder = (courseId: number | null) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonKinds, setLessonKinds] = useState<Record<number, LessonKind>>({});
  const [videos, setVideos] = useState<Record<number, Video[]>>({});
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const processingProgressByVideoId = useVideoProgress(courseId, videos, setVideos);

  const hydrate = useCallback((content: InstructorCourseContent) => {
    const nextKinds: Record<number, LessonKind> = {};
    const nextVideos: Record<number, Video[]> = {};
    const nextQuestions: Record<number, Question[]> = {};

    content.lessons.forEach((lesson) => {
      nextKinds[lesson.id] = lesson.questions.length > 0 ? 'QUIZ' : 'VIDEO';
      nextVideos[lesson.id] = lesson.videos;
      nextQuestions[lesson.id] = lesson.questions;
    });

    setLessons(content.lessons);
    setLessonKinds(nextKinds);
    setVideos(nextVideos);
    setQuestions(nextQuestions);
  }, []);

  const addLesson = useCallback((lesson: Lesson, kind: LessonKind) => {
    setLessons((previous) => [...previous, lesson]);
    setLessonKinds((previous) => ({ ...previous, [lesson.id]: kind }));
    setVideos((previous) => ({ ...previous, [lesson.id]: [] }));
    setQuestions((previous) => ({ ...previous, [lesson.id]: [] }));
  }, []);

  const updateLesson = useCallback((updated: Lesson) => {
    setLessons((previous) => previous.map((lesson) => (
      lesson.id === updated.id ? updated : lesson
    )));
  }, []);

  const removeLesson = useCallback((lessonId: number) => {
    setLessons((previous) => previous.filter((lesson) => lesson.id !== lessonId));
    const omit = <T,>(map: Record<number, T>) => {
      const { [lessonId]: _removed, ...rest } = map;
      return rest;
    };
    setLessonKinds(omit);
    setVideos(omit);
    setQuestions(omit);
  }, []);

  const changeVideos = useCallback(
    (lessonId: number, updater: (previous: Video[]) => Video[]) => {
      setVideos((previous) => ({
        ...previous,
        [lessonId]: updater(previous[lessonId] ?? []),
      }));
    },
    []
  );

  const changeQuestions = useCallback((lessonId: number, next: Question[]) => {
    setQuestions((previous) => ({ ...previous, [lessonId]: next }));
  }, []);

  return {
    lessons,
    lessonKinds,
    videos,
    questions,
    processingProgressByVideoId,
    setLessons,
    hydrate,
    addLesson,
    updateLesson,
    removeLesson,
    changeVideos,
    changeQuestions,
  };
};
