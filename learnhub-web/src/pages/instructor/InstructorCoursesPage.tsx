import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import {
  CourseThumbnail,
  Dropdown,
  DropdownOption,
  PageSkeleton,
  Pagination,
} from '../../components/common';
import { useCourseRealtime } from '../../context/NotificationContext';
import { useCoalescedRefreshTrigger } from '../../hooks/useCoalescedRefreshTrigger';
import { useCategories } from '../../hooks/useCategories';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { queryKeys } from '../../query/queryKeys';
import { instructorService } from '../../services/api/instructor.service';
import {
  InstructorCourse,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { formatPrice, formatLongDate } from '../../utils';
import { shouldRefreshInstructorCourseList } from '../../utils/courseRealtime';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './InstructorCoursesPage.css';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Tất cả' },
  ...(Object.entries(COURSE_STATUS_LABELS) as Array<[string, string]>).map(([value, label]) => ({
    value,
    label,
  })),
];

const InstructorCoursesPage: React.FC = () => {
  const {
    searchParams,
    page: currentPage,
    search: searchQuery,
    searchInput: localSearch,
    setPage,
    setParam,
    setSearch,
  } = usePagedSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { lastCourseStatusEvent, realtimeReconnectVersion } = useCourseRealtime();

  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';
  const { refreshVersion, scheduleRefresh } = useCoalescedRefreshTrigger();
  const filtersRef = useRef({ status: statusFilter, category: categoryFilter, search: searchQuery });
  const seenReconnectVersion = useRef(realtimeReconnectVersion);
  const seenRefreshVersion = useRef(refreshVersion);
  filtersRef.current = { status: statusFilter, category: categoryFilter, search: searchQuery };

  useEffect(() => {
    if (!lastCourseStatusEvent) return;
    if (shouldRefreshInstructorCourseList(lastCourseStatusEvent, filtersRef.current)) {
      scheduleRefresh();
    }
  }, [lastCourseStatusEvent, scheduleRefresh]);

  useEffect(() => {
    if (realtimeReconnectVersion === seenReconnectVersion.current) return;
    seenReconnectVersion.current = realtimeReconnectVersion;
    scheduleRefresh();
  }, [realtimeReconnectVersion, scheduleRefresh]);

  const { categories } = useCategories(true);

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({ value: category.name, label: category.name })),
    ],
    [categories]
  );

  const courseFilters = {
    page: currentPage,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  };
  const courseQuery = useQuery({
    queryKey: queryKeys.instructorCourses.list(courseFilters),
    queryFn: ({ signal }) => instructorService.getMyCourses(
      { ...courseFilters, size: uiConfig.pagination.coursePageSize },
      signal
    ),
    placeholderData: keepPreviousData,
  });
  const pageData = courseQuery.data ?? null;
  const courses: InstructorCourse[] = pageData?.content ?? [];
  const loading = courseQuery.isFetching;
  const error = courseQuery.error
    ? 'Không thể tải danh sách khóa học. Vui lòng thử lại sau.'
    : null;

  useEffect(() => {
    if (seenRefreshVersion.current === refreshVersion) return;
    seenRefreshVersion.current = refreshVersion;
    void courseQuery.refetch();
  }, [courseQuery.refetch, refreshVersion]);

  const openCourse = useCallback(
    (course: InstructorCourse) => {
      const destination =
        course.status === 'DRAFT' || course.status === 'REJECTED'
          ? routeTo.instructorCourseBuild(course.id)
          : routeTo.instructorCourseEdit(course.id);
      navigate(destination, {
        state: { from: `${location.pathname}${location.search}` },
      });
    },
    [navigate, location.pathname, location.search]
  );

  return (
    <div className="instructor-page">

      <main className="instructor-main">
        <div className="container py-4">
          { }
          <div className="instructor-toolbar mb-4">
            <button
              type="button"
              className="btn-create-course"
              onClick={() => navigate(ROUTE_PATHS.instructorCourseCreate)}
            >
              <i className="bi bi-plus-lg"></i>
              Soạn khóa học
            </button>

            {
}
            <div className="instructor-toolbar-filters">
              <Dropdown
                className="instructor-dropdown"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={(value) => setParam('status', value)}
                ariaLabel="Lọc theo trạng thái"
              />

              <Dropdown
                className="instructor-dropdown"
                value={categoryFilter}
                options={categoryOptions}
                onChange={(value) => setParam('category', value)}
                ariaLabel="Lọc theo danh mục"
              />

              <div className="instructor-search">
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={localSearch}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Tìm kiếm khóa học"
                />
                <i className="bi bi-search"></i>
              </div>
            </div>
          </div>

          <div
            className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
            aria-busy={loading}
          >
          {loading && !pageData ? (
            <PageSkeleton variant="cards" count={6} />
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div className="instructor-empty text-center py-5">
              <p className="fs-5 text-muted mb-0">
                {statusFilter || categoryFilter || searchQuery
                  ? 'Không tìm thấy khóa học nào phù hợp.'
                  : 'Bạn chưa có khóa học nào.'}
              </p>
            </div>
          ) : (
            <>
              <div className="row g-4 motion-stagger">
                {courses.map((course) => {
                  const created = formatLongDate(course.createdAt);
                  return (
                    <div key={course.id} className="col-12 col-md-6 col-xl-3">
                      <article
                        className="instructor-course-card h-100"
                        role="button"
                        tabIndex={0}
                        onClick={() => openCourse(course)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openCourse(course);
                          }
                        }}
                      >
                        <div className="instructor-course-thumb">
                          <CourseThumbnail
                            src={course.thumbnail}
                            alt={course.title}
                            placeholder={<div className="instructor-course-thumb-empty" />}
                          />
                          <span
                            className={`instructor-status instructor-status-${course.status.toLowerCase()}`}
                          >
                            {COURSE_STATUS_LABELS[course.status] ?? course.status}
                          </span>

                        </div>

                        <div className="instructor-course-body">
                          <h2 className="instructor-course-title">{course.title}</h2>

                          <p className="instructor-course-meta">
                            <i className="bi bi-tag"></i>
                            {course.categoryName}
                          </p>
                          {created && (
                            <p className="instructor-course-meta">
                              <i className="bi bi-calendar3"></i>
                              {created}
                            </p>
                          )}

                          <div className="instructor-course-footer">
                            <span className="instructor-course-price">{formatPrice(course.price)}</span>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
              {pageData && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pageData.totalPages}
                  isFirst={pageData.first}
                  isLast={pageData.last}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default InstructorCoursesPage;
