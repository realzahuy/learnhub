import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import { BackButton, LoadingScreen, PageSkeleton, Pagination, StarRating } from '../../components/common';
import { instructorProfileService } from '../../services/api/instructorProfile.service';
import { queryKeys } from '../../query/queryKeys';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './InstructorProfilePage.css';

const InstructorProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedPage = Number(searchParams.get('page') ?? 0);
  const currentPage = Number.isInteger(parsedPage) && parsedPage >= 0 ? parsedPage : 0;
  const instructorId = Number(id);
  const enabled = Number.isSafeInteger(instructorId) && instructorId > 0;
  const profileQuery = useQuery({
    queryKey: queryKeys.publicInstructors.profile(instructorId),
    enabled,
    queryFn: ({ signal }) => instructorProfileService.getProfile(instructorId, signal),
  });
  const coursesQuery = useQuery({
    queryKey: queryKeys.publicInstructors.courses(instructorId, currentPage),
    enabled,
    queryFn: ({ signal }) => instructorProfileService.getCourses(instructorId, currentPage, signal),
    placeholderData: keepPreviousData,
  });
  const profile = profileQuery.data ?? null;
  const coursePage = coursesQuery.data ?? null;
  const isLoading = enabled && profileQuery.isPending;
  const coursesLoading = coursesQuery.isFetching;
  const error = profileQuery.error
    ? getApiErrorMessage(profileQuery.error, 'Không tìm thấy giảng viên')
    : null;
  const coursesError = coursesQuery.error
    ? getApiErrorMessage(coursesQuery.error, 'Không tải được khóa học của giảng viên')
    : null;

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
