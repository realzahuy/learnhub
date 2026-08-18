import { CourseStatusChangedEvent } from '../types/realtime.types';

interface CourseListFilters {
  status: string;
  category: string;
  search: string;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase('vi-VN');

const matchesCategoryAndSearch = (
  event: CourseStatusChangedEvent,
  filters: CourseListFilters
) => {
  const categoryMatches = !filters.category
    || normalize(event.categoryName) === normalize(filters.category);
  const searchMatches = !filters.search
    || normalize(event.title).includes(normalize(filters.search));
  return categoryMatches && searchMatches;
};

export const shouldRefreshAdminCourseList = (
  event: CourseStatusChangedEvent,
  filters: CourseListFilters
) => event.status === filters.status && matchesCategoryAndSearch(event, filters);

export const shouldRefreshInstructorCourseList = (
  event: CourseStatusChangedEvent,
  filters: CourseListFilters
) => {
  const statusMatches = filters.status === ''
    || filters.status === 'PENDING'
    || filters.status === event.status;
  return statusMatches && matchesCategoryAndSearch(event, filters);
};
