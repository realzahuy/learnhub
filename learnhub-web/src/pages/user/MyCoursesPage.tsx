import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Dropdown,
  DropdownOption,
  LoadingScreen,
  PageSkeleton,
  Pagination,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { enrollmentService } from '../../services/api/enrollment.service';
import { Enrollment } from '../../types/enrollment.types';
import { PageResponse } from '../../types/pagination.types';
import { formatLongDate, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './MyCoursesPage.css';

const MyCoursesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '0');
  const categoryFilter = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { categories } = useCategories();

  const [pageData, setPageData] = useState<PageResponse<Enrollment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const updateFilter = useCallback(
    (key: 'category' | 'search', value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      next.set('page', '0');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const [pushSearchToUrl] = useDebouncedCallback(
    (value: string) => updateFilter('search', value.trim()),
    500
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      pushSearchToUrl(value);
    },
    [pushSearchToUrl]
  );

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handlePageChange = useCallback(
    (page: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', page.toString());
      setSearchParams(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    enrollmentService
      .list({
        page: currentPage,
        size: 12,
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      })
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Không thể tải danh sách ghi danh:', err);
        setError(getApiErrorMessage(err, 'Không tải được danh sách khóa học của bạn.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentPage, categoryFilter, searchQuery]);

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
              onChange={(value) => updateFilter('category', value)}
              ariaLabel="Lọc khóa học của tôi theo danh mục"
            />

            <div className="my-courses-search">
              <input
                type="text"
                placeholder="Tìm kiếm khóa học của tôi"
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
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

                const percent =
                  enrollment.totalLessons > 0
                    ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100)
                    : 0;

                return (

                  <div key={enrollment.enrollmentId} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    {
}
                    <Link
                      to={routeTo.learning(enrollment.courseSlug)}
                      className="my-course-card h-100"
                    >
                      <div className="my-course-thumb">
                        {enrollment.courseThumbnail ? (
                          <img src={enrollment.courseThumbnail} alt={enrollment.courseTitle} />
                        ) : (
                          <div className="my-course-thumb-empty" />
                        )}
                      </div>

                      <div className="my-course-body">
                        <h2 className="my-course-name">{enrollment.courseTitle}</h2>
                        <p className="my-course-instructor">{enrollment.instructorName}</p>

                        {
}
                        <div className="my-course-progress">
                          <div className="my-course-progress-bar">
                            <span style={{ width: `${percent}%` }} />
                          </div>
                          <p className="my-course-progress-text">
                            {percent === 0
                              ? enrolled
                                ? `Chưa học · ghi danh ${enrolled}`
                                : 'Chưa học'
                              : `${percent}% hoàn thành · ${enrollment.completedLessons}/${enrollment.totalLessons} bài`}
                          </p>
                        </div>
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
                onPageChange={handlePageChange}
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
