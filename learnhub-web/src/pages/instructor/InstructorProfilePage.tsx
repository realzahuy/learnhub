import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import { BackButton, LoadingScreen, PageSkeleton, Pagination, StarRating } from '../../components/common';
import { reviewService } from '../../services/api/review.service';
import { Course } from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import { InstructorProfile } from '../../types/review.types';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './InstructorProfilePage.css';

const InstructorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPage = Number(searchParams.get('page') ?? 0);
  const currentPage = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coursePage, setCoursePage] = useState<PageResponse<Course> | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setIsLoading(true);
    reviewService
      .getInstructorProfile(Number(id), controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setProfile(data);
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(getApiErrorMessage(err, 'Không tìm thấy giảng viên'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setCoursesLoading(true);
    setCoursesError(null);
    reviewService
      .getInstructorCourses(Number(id), currentPage, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCoursePage(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setCoursesError(getApiErrorMessage(err, 'Không tải được khóa học của giảng viên'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCoursesLoading(false);
      });

    return () => controller.abort();
  }, [id, currentPage]);

  const handlePageChange = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page === 0) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return <LoadingScreen variant="detail" />;
  }

  if (error || !profile) {
    return (
      <div className="container py-5 text-center">
        <div className="text-start mb-4">
          <BackButton fallback={ROUTE_PATHS.courses} />
        </div>
        <p className="text-muted fs-4">{error ?? 'Không tìm thấy giảng viên'}</p>
        <Link to={ROUTE_PATHS.courses} className="btn btn-notion mt-3">
          Xem các khóa học
        </Link>
      </div>
    );
  }

  const joined = new Date(profile.joinedAt);
  const joinedLabel = Number.isNaN(joined.getTime())
    ? null
    : `Tham gia từ tháng ${joined.getMonth() + 1}/${joined.getFullYear()}`;

  return (
    <div className="instructor-profile">
        <BackButton fallback={ROUTE_PATHS.courses} />
        <div className="container">
          <div className="instructor-hero">
            <div className="instructor-hero__top">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.fullName}
                  className="instructor-hero__avatar"
                />
              ) : (
                <i
                  className="bi bi-person-circle instructor-hero__avatar-fallback"
                  aria-hidden="true"
                />
              )}

              <div>
                <h1 className="instructor-hero__name">{profile.fullName}</h1>
                {joinedLabel && <div className="instructor-hero__joined">{joinedLabel}</div>}

                {profile.totalReviews > 0 && (
                  <div className="mt-2">
                    <StarRating
                      value={profile.averageRating}
                      size="md"
                      showValue
                    />
                  </div>
                )}
              </div>
            </div>

            {profile.bio && <p className="instructor-hero__bio">{profile.bio}</p>}

            <div className="instructor-stats">
              <div className="instructor-stat">
                <div className="instructor-stat__value instructor-stat__value--rating">
                  {profile.totalReviews > 0 ? profile.averageRating.toFixed(1) : '—'}
                </div>
                <div className="instructor-stat__label">Điểm đánh giá</div>
              </div>

              <div className="instructor-stat">
                <div className="instructor-stat__value">
                  {profile.totalReviews.toLocaleString(uiConfig.formatting.locale)}
                </div>
                <div className="instructor-stat__label">Lượt đánh giá</div>
              </div>

              <div className="instructor-stat">
                <div className="instructor-stat__value">
                  {profile.totalStudents.toLocaleString(uiConfig.formatting.locale)}
                </div>
                <div className="instructor-stat__label">Học viên</div>
              </div>

              <div className="instructor-stat">
                <div className="instructor-stat__value">{profile.totalCourses}</div>
                <div className="instructor-stat__label">Khóa học</div>
              </div>
            </div>
          </div>

          <div className="instructor-courses">
            <h2 className="h4 fw-bold mb-3">
              Các khóa học của giảng viên
            </h2>

            {coursesLoading ? (
              <PageSkeleton variant="cards" count={3} />
            ) : coursesError ? (
              <p className="text-danger">{coursesError}</p>
            ) : profile.totalCourses === 0 ? (
              <p className="text-muted">Giảng viên chưa xuất bản khóa học nào.</p>
            ) : (
              <>
                <div className="row g-4">
                  {(coursePage?.content ?? []).map((course) => (
                    <div key={course.id} className="col-12 col-sm-6 col-lg-4">
                      <Link to={routeTo.courseDetail(course.slug)} className="instructor-course-card">
                        {course.thumbnail ? (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="instructor-course-card__thumb"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="instructor-course-card__thumb" />
                        )}

                        <div className="instructor-course-card__body">
                          <div className="instructor-course-card__title">{course.title}</div>

                          {course.reviewCount > 0 && (
                            <div className="mb-2">
                              <StarRating
                                value={course.averageRating}
                                size="sm"
                                showValue
                                count={course.reviewCount}
                              />
                            </div>
                          )}

                          <div className="instructor-course-card__price">
                            {formatPrice(course.price)}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {coursePage && (
                  <Pagination
                    currentPage={coursePage.pageNumber}
                    totalPages={coursePage.totalPages}
                    isFirst={coursePage.first}
                    isLast={coursePage.last}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </div>
    </div>
  );
};

export default InstructorProfilePage;
