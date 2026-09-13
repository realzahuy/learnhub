import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { instructorService } from '../services/api/instructor.service';
import { queryClient } from '../query/queryClient';
import { queryKeys } from '../query/queryKeys';
import { InstructorCourseContent, Lesson, Video } from '../types/lesson.types';
import { Question } from '../types/question.types';
import { useVideoProgress } from './useVideoProgress';

export const useCourseBuilder = (courseId: number | null, trackVideoProgress = true) => {
  const [draft, setDraft] = useState<InstructorCourseContent | null>(null);
  const contentQuery = useQuery({
    queryKey: queryKeys.instructorCourses.content(courseId),
    queryFn: ({ signal }) => instructorService.getCourseContent(courseId!, signal),
    enabled: courseId !== null && draft === null,
  });
  const content = draft ?? contentQuery.data;
  const lessons = useMemo(() => content?.lessons ?? [], [content]);
  const videos = useMemo(() => Object.fromEntries(
    lessons.map((lesson) => [lesson.id, lesson.videos])
  ), [lessons]);
  const questions = useMemo(() => Object.fromEntries(
    lessons.map((lesson) => [lesson.id, lesson.questions])
  ), [lessons]);

  const updateContent = useCallback((updater: (previous: InstructorCourseContent) => InstructorCourseContent) => {
    const queryKey = queryKeys.instructorCourses.content(courseId);
    const current = queryClient.getQueryData<InstructorCourseContent>(queryKey);
    if (!current) return;
    const next = updater(current);
    if (next === current) return;
    void queryClient.cancelQueries({ queryKey, exact: true }, { revert: false });
    queryClient.setQueryData(queryKey, next);
    setDraft(next);
  }, [courseId]);

  const setVideos = useCallback<Dispatch<SetStateAction<Record<number, Video[]>>>>((updater) => {
    updateContent((previous) => {
      const current = Object.fromEntries(previous.lessons.map((lesson) => [lesson.id, lesson.videos]));
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (next === current) return previous;
      return {
        ...previous,
        lessons: previous.lessons.map((lesson) => lesson.videos === next[lesson.id]
          ? lesson
          : { ...lesson, videos: next[lesson.id] ?? [] }),
      };
    });
  }, [updateContent]);

  const setLessons = useCallback<Dispatch<SetStateAction<Lesson[]>>>((updater) => {
    updateContent((previous) => {
      const next = typeof updater === 'function' ? updater(previous.lessons) : updater;
      return {
        ...previous,
        lessons: next.map((lesson) => {
          const existing = previous.lessons.find((item) => item.id === lesson.id);
          if (lesson === existing) return existing;
          return { ...lesson, videos: existing?.videos ?? [], questions: existing?.questions ?? [] };
        }),
      };
    });
  }, [updateContent]);
  const processingProgressByVideoId = useVideoProgress(
    trackVideoProgress ? courseId : null,
    videos,
    setVideos
  );

  const addLesson = useCallback((lesson: Lesson) => {
    setLessons((previous) => [...previous, lesson]);
  }, [setLessons]);

  const updateLesson = useCallback((updated: Lesson) => {
    setLessons((previous) => previous.map((lesson) => (
      lesson.id === updated.id ? updated : lesson
    )));
  }, [setLessons]);

  const removeLesson = useCallback((lessonId: number) => {
    setLessons((previous) => previous.filter((lesson) => lesson.id !== lessonId));
  }, [setLessons]);

  const changeVideos = useCallback(
    (lessonId: number, updater: (previous: Video[]) => Video[]) => {
      setVideos((previous) => ({
        ...previous,
        [lessonId]: updater(previous[lessonId] ?? []),
      }));
    },
    [setVideos]
  );

  const changeQuestions = useCallback(
    (lessonId: number, updater: (previous: Question[]) => Question[]) => {
      updateContent((previous) => ({
        ...previous,
        lessons: previous.lessons.map((lesson) => lesson.id === lessonId
          ? { ...lesson, questions: updater(lesson.questions) }
          : lesson),
      }));
    },
    [updateContent]
  );

  return {
    lessons,
    videos,
    questions,
    processingProgressByVideoId,
    setLessons,
    loading: courseId !== null && !content && contentQuery.isPending,
    error: !content ? contentQuery.error : null,
    addLesson,
    updateLesson,
    removeLesson,
    changeVideos,
    changeQuestions,
  };
};
