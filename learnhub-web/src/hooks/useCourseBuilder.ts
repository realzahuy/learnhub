import { useCallback, useState } from 'react';
import { InstructorCourseContent, Lesson, Video } from '../types/lesson.types';
import { Question } from '../types/question.types';
import { useVideoProgress } from './useVideoProgress';

export const useCourseBuilder = (courseId: number | null, trackVideoProgress = true) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [videos, setVideos] = useState<Record<number, Video[]>>({});
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const processingProgressByVideoId = useVideoProgress(
    trackVideoProgress ? courseId : null,
    videos,
    setVideos
  );

  const hydrate = useCallback((content: InstructorCourseContent) => {
    const nextVideos: Record<number, Video[]> = {};
    const nextQuestions: Record<number, Question[]> = {};

    content.lessons.forEach((lesson) => {
      nextVideos[lesson.id] = lesson.videos;
      nextQuestions[lesson.id] = lesson.questions;
    });

    setLessons(content.lessons);
    setVideos(nextVideos);
    setQuestions(nextQuestions);
  }, []);

  const addLesson = useCallback((lesson: Lesson) => {
    setLessons((previous) => [...previous, lesson]);
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
