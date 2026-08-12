import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Pagination } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
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

  const [pageData, setPageData] = useState<PageResponse<Enrollment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    enrollmentService
      .list({ page: currentPage })
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
  }, [isAuthenticated, currentPage]);

  if (isAuthLoading) {
    return (
      <div className="my-courses-page">
        <main className="my-courses-main">
          <div className="container py-5 text-center">
            <div className="spinner-border text-notion" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        </main>
      </div>
    );
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

          <div
            className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
            aria-busy={loading}
          >
          {loading && pageData && (
            <div className="motion-loading-indicator" role="status">
              <span className="spinner-border text-notion" aria-hidden="true" />
              Äang cáº­p nháº­t
            </div>
          )}

          {loading && !pageData ? (
            <div className="text-center py-5">
              <div className="spinner-border text-notion" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : enrollments.length === 0 ? (
            <div className="my-courses-empty">
              <p className="mb-3">Bạn chưa ghi danh khóa học nào.</p>
              <button type="button" className="btn btn-notion" onClick={() => navigate(ROUTE_PATHS.courses)}>
                Khám phá khóa học
              </button>
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
