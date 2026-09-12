import type { AdminUserFilter } from '../types/admin.types';
import type { CourseSort } from '../types/course.types';

interface PublishedCourseFilters {
  page: number;
  search?: string;
  category?: string;
  sort: CourseSort;
}

interface EnrollmentFilters {
  page: number;
  category?: string;
  search?: string;
}

interface InstructorCourseFilters {
  page: number;
  status?: string;
  category?: string;
  search?: string;
}

interface AdminUserFilters {
  page: number;
  filter: AdminUserFilter;
  search?: string;
}

interface AdminCourseFilters {
  page: number;
  status: string;
  category?: string;
  search?: string;
}

export const queryKeys = {
  categories: {
    all: ['categories'] as const,
  },
  publishedCourses: {
    all: ['published-courses'] as const,
    list: (filters: PublishedCourseFilters) =>
      [...queryKeys.publishedCourses.all, filters] as const,
  },
  courseDetails: {
    all: ['course-details'] as const,
    detail: (slug: string | undefined) => [...queryKeys.courseDetails.all, slug] as const,
  },
  reviews: {
    all: ['course-reviews'] as const,
    byCourse: (slug: string | undefined) => [...queryKeys.reviews.all, slug] as const,
    list: (slug: string, page: number, userId: number | null) =>
      [...queryKeys.reviews.byCourse(slug), 'list', page, userId] as const,
    summary: (slug: string | undefined) => [...queryKeys.reviews.byCourse(slug), 'summary'] as const,
    mine: (slug: string, userId: number | null) =>
      [...queryKeys.reviews.byCourse(slug), 'mine', userId] as const,
  },
  enrollments: {
    all: ['enrollments'] as const,
    list: (filters: EnrollmentFilters) =>
      [...queryKeys.enrollments.all, filters] as const,
    status: (userId: number | null, courseId: number | null) =>
      [...queryKeys.enrollments.all, 'status', userId, courseId] as const,
  },
  instructorCourses: {
    all: ['instructor-courses'] as const,
    list: (filters: InstructorCourseFilters) =>
      [...queryKeys.instructorCourses.all, filters] as const,
  },
  adminCourses: {
    all: ['admin-courses'] as const,
    list: (filters: AdminCourseFilters) => [...queryKeys.adminCourses.all, filters] as const,
    content: (courseId: number) => [...queryKeys.adminCourses.all, 'content', courseId] as const,
  },
  publicInstructors: {
    all: ['public-instructors'] as const,
    profile: (instructorId: number) =>
      [...queryKeys.publicInstructors.all, 'profile', instructorId] as const,
    courses: (instructorId: number, page: number) =>
      [...queryKeys.publicInstructors.all, 'courses', instructorId, page] as const,
  },
  learningCourses: {
    all: ['learning-courses'] as const,
    detail: (slug: string | undefined) => [...queryKeys.learningCourses.all, slug] as const,
  },
  quizzes: {
    all: ['lesson-quizzes'] as const,
    detail: (lessonId: number) => [...queryKeys.quizzes.all, lessonId] as const,
  },
  stats: {
    all: ['stats-dashboard'] as const,
    overview: (scope: string) => [...queryKeys.stats.all, scope, 'overview'] as const,
    timeSeries: (
      scope: string,
      groupBy: string,
      from: string | undefined,
      to: string | undefined
    ) => [...queryKeys.stats.all, scope, 'timeseries', groupBy, from, to] as const,
  },
  adminUsers: {
    all: ['admin-users'] as const,
    list: (filters: AdminUserFilters) =>
      [...queryKeys.adminUsers.all, filters] as const,
  },
};
