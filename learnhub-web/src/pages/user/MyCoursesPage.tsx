import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import {
  CourseThumbnail,
  Dropdown,
  DropdownOption,
  LoadingScreen,
  PageSkeleton,
  Pagination,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { queryKeys } from '../../query/queryKeys';
import { enrollmentService } from '../../services/api/enrollment.service';
import { formatLongDate, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './MyCoursesPage.css';

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    searchParams,
    page: currentPage,
    search: searchQuery,
    searchInput: localSearch,
    setPage,
    setParam,
    setSearch,
  } = usePagedSearchParams();

  const categoryFilter = searchParams.get('category') || '';
  const { categories } = useCategories();

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({
        value: category.name,
        label: category.name,
      })),
    ],
    [categories]
  );

  const enrollmentFilters = {
    page: currentPage,
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  };
  const enrollmentQuery = useQuery({
    queryKey: queryKeys.enrollments.list(enrollmentFilters),
    queryFn: ({ signal }) => enrollmentService.list(
      { ...enrollmentFilters, size: uiConfig.pagination.coursePageSize },
      signal
    ),
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  });
  const pageData = enrollmentQuery.data ?? null;
  const loading = enrollmentQuery.isFetching;
  const error = enrollmentQuery.error
    ? getApiErrorMessage(
        enrollmentQuery.error,
        'Không tải được danh sách khóa học của bạn.'
      )
    : null;

  if (isAuthLoading) {
    return <LoadingScreen variant="cards" count={6} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: ROUTE_PATHS.myCourses }} />;
  }

  const enrollments = pageData?.content ?? [];

  return (
    <div className="my-courses-page">

      <main className="my-courses-main">
        <div className="container py-4">
          <h1 className="my-courses-title">Khóa học của tôi</h1>

          <div className="my-courses-toolbar">
            <Dropdown
              className="my-courses-category"
              value={categoryFilter}
              options={categoryOptions}
              onChange={(value) => setParam('category', value)}
              ariaLabel="Lọc khóa học của tôi theo danh mục"
            />

            <div className="my-courses-search">
              <input
                type="text"
                placeholder="Tìm kiếm khóa học của tôi"
                value={localSearch}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Tìm kiếm khóa học của tôi"
              />
              <i className="bi bi-search" aria-hidden="true" />
            </div>
          </div>

          <div
            className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
            aria-busy={loading}
          >
          {loading && !pageData ? (
            <PageSkeleton variant="cards" count={6} />
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : enrollments.length === 0 ? (
            <div className="my-courses-empty">
              {categoryFilter || searchQuery ? (
                <p className="mb-0">Không tìm thấy khóa học nào phù hợp.</p>
              ) : (
                <>
                  <p className="mb-3">Bạn chưa ghi danh khóa học nào.</p>
                  <button type="button" className="btn btn-notion" onClick={() => navigate(ROUTE_PATHS.courses)}>
                    Khám phá khóa học
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
            <div className="row g-4 motion-stagger">
              {enrollments.map((enrollment) => {
                const enrolled = formatLongDate(enrollment.enrolledAt);

                return (

                  <div key={enrollment.enrollmentId} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    {
}
                    <Link
                      to={routeTo.learning(enrollment.courseSlug)}
                      className="my-course-card h-100"
                    >
                      <div className="my-course-thumb">
                        <CourseThumbnail
                          src={enrollment.courseThumbnail}
                          alt={enrollment.courseTitle}
                          placeholder={<div className="my-course-thumb-empty" />}
                        />
                      </div>

                      <div className="my-course-body">
                        <h2 className="my-course-name">{enrollment.courseTitle}</h2>
                        <p className="my-course-instructor">{enrollment.instructorName}</p>

                        {
}
                        <p className="my-course-meta">
                          {enrollment.totalLessons} bài học
                          {enrolled ? ` · Ghi danh ${enrolled}` : ''}
                        </p>
                      </div>
                    </Link>
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

export default MyCoursesPage;
