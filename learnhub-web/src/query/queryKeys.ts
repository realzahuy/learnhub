import type { AdminUserFilter } from '../types/admin.types';
import type { CourseSort } from '../types/course.types';

export interface PublishedCourseFilters {
  page: number;
  search?: string;
  category?: string;
  sort: CourseSort;
}

export interface EnrollmentFilters {
  page: number;
  category?: string;
  search?: string;
}

export interface InstructorCourseFilters {
  page: number;
  status?: string;
  category?: string;
  search?: string;
}

export interface AdminUserFilters {
  page: number;
  filter: AdminUserFilter;
  search?: string;
}

export const queryKeys = {
  publishedCourses: {
    all: ['published-courses'] as const,
    list: (filters: PublishedCourseFilters) =>
      [...queryKeys.publishedCourses.all, filters] as const,
  },
  enrollments: {
    all: ['enrollments'] as const,
    list: (filters: EnrollmentFilters) =>
      [...queryKeys.enrollments.all, filters] as const,
  },
  instructorCourses: {
    all: ['instructor-courses'] as const,
    list: (filters: InstructorCourseFilters) =>
      [...queryKeys.instructorCourses.all, filters] as const,
  },
  adminUsers: {
    all: ['admin-users'] as const,
    list: (filters: AdminUserFilters) =>
      [...queryKeys.adminUsers.all, filters] as const,
  },
};

