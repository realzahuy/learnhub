import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CourseCurriculum,
  CourseHero,
  CoursePreviewModal,
  InstructorCard,
} from '../../components/features/course';
import CourseReviewSection from '../../components/features/review/CourseReviewSection';
import { LoadingScreen } from '../../components/common';
import { courseService } from '../../services/api/course.service';
import { CourseDetail, PublicLesson, PublicVideo } from '../../types/course.types';
import { RatingSummary } from '../../types/review.types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { enrollmentService } from '../../services/api/enrollment.service';
import { reviewService } from '../../services/api/review.service';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import { formatPrice, getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './CourseDetailPage.css';

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userId } = useAuth();
  const { addToCart, isInCart, removeFromCart } = useCart();
  const { showToast } = useToast();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const courseQuery = useQuery<CourseDetail>({
    queryKey: queryKeys.courseDetails.detail(slug),
    enabled: Boolean(slug),
    queryFn: ({ signal }) => courseService.getCourseBySlug(slug!, signal),
  });
  const course = courseQuery.data ?? null;
  const summaryQuery = useQuery<RatingSummary>({
    queryKey: queryKeys.reviews.summary(slug),
    enabled: Boolean(slug && course),
    queryFn: ({ signal }) => reviewService.getCourseSummary(slug!, signal),
    initialData: course?.ratingSummary,
  });
  const isLoading = courseQuery.isPending;
  const error = courseQuery.error
    ? getApiErrorMessage(
        courseQuery.error,
        'Không thể tải thông tin khóa học. Vui lòng thử lại sau.'
      )
    : null;

  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const [preview, setPreview] = useState<{ lesson: PublicLesson; videoId: number } | null>(null);

  const ratingSummary = summaryQuery.data ?? course?.ratingSummary;
  const averageRating = ratingSummary?.average ?? 0;
  const reviewCount = ratingSummary?.totalReviews ?? 0;

  const reviewsRef = useRef<HTMLDivElement>(null);

  const scrollToReviews = () =>
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const playableVideos = (lesson: PublicLesson): PublicVideo[] =>
    lesson.videos.filter((video) => video.previewUrl);

  const openPreview = (lesson: PublicLesson, videoId: number) =>
    setPreview({ lesson, videoId });

  useEffect(() => {
    setThumbnailFailed(false);
  }, [slug]);

  const enrollmentQuery = useQuery<boolean>({
    queryKey: queryKeys.enrollments.status(userId, course?.id ?? null),
    enabled: userId !== null && course !== null,
    queryFn: ({ signal }) => enrollmentService.checkEnrolled(course!.id, signal),
  });
  const isEnrolled = enrollmentQuery.data === true;
  const isCheckingEnrollment = userId !== null && course !== null && enrollmentQuery.isPending;

  const handleEnroll = async () => {
    if (!isAuthenticated) {

      navigate(ROUTE_PATHS.login, {
        state: { from: slug ? routeTo.courseDetail(slug) : ROUTE_PATHS.courses },
      });
      return;
    }
    if (!course || isEnrolling) return;

    setIsEnrolling(true);
    try {
      const enrollment = await enrollmentService.enrollFree(course.id);

      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      removeFromCart(course.id);
      showToast(enrollment.message || 'Đã thêm khóa học vào tài khoản.', 'success');
      navigate(ROUTE_PATHS.myCourses);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không đăng ký được khóa học. Vui lòng thử lại.'), 'error');
      setIsEnrolling(false);
    }
  };

  const handleAddToCart = () => {
    if (!course) return;
    addToCart({
      id: course.id,
      title: course.title,
      slug: course.slug,
      thumbnail: course.thumbnail,
      price: course.price,
      instructorName: course.instructorName,
    });
  };

  const handleBuyNow = () => {
    if (!course) return;
    if (!isInCart(course.id)) {
      handleAddToCart();
    }
    navigate(ROUTE_PATHS.cart);
  };

  if (isLoading) {
    return <LoadingScreen variant="detail" />;
  }

  if (error || !course) {
    return (
      <div className="course-detail-page">
        <main className="course-detail-main">
          <div className="container py-5">
            <div className="alert alert-danger" role="alert">
              {error || 'Không tìm thấy khóa học'}
            </div>
            <button className="btn btn-notion" onClick={() => navigate(ROUTE_PATHS.home)}>
              Về trang chủ
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="course-detail-page">

      <main className="course-detail-main">
      <CourseHero
        course={course}
        averageRating={averageRating}
        reviewCount={reviewCount}
        thumbnailFailed={thumbnailFailed}
        onBrowseCourses={() => navigate(ROUTE_PATHS.courses)}
        onBrowseCategory={() =>
          navigate(`${ROUTE_PATHS.courses}?category=${encodeURIComponent(course.categoryName)}`)
        }
        onScrollToReviews={scrollToReviews}
        onThumbnailError={() => setThumbnailFailed(true)}
      />

      <div className="container my-5">
        <div className="row">
          <div className="col-lg-8">
            <div className="course-content-card mb-4">
              <h2 className="h4 fw-bold mb-3">Mô tả khóa học</h2>
              <div className="course-description">{course.description}</div>
            </div>

            <CourseCurriculum lessons={course.lessons} onOpenPreview={openPreview} />

            <InstructorCard course={course} />

            <div ref={reviewsRef}>
              <CourseReviewSection
                slug={course.slug}
                initialSummary={ratingSummary}
                isEnrolled={isEnrolled}
              />
            </div>
          </div>

          <div className="col-lg-4">
            <div className="price-card sticky-top">
              <div className="price-header text-center mb-4">
                <h3 className="display-4 fw-bold text-notion mb-0">
                  {course.price === 0 ? 'Miễn phí' : formatPrice(course.price)}
                </h3>
              </div>

              {isCheckingEnrollment ? (
                <button className="btn btn-notion w-100 btn-lg mb-3" disabled>
                  Đang kiểm tra...
                </button>
              ) : isEnrolled ? (
                <>
                  <p className="course-owned-note">
                    <i className="bi bi-check-circle-fill"></i>
                    Bạn đã sở hữu khóa học này
                  </p>
                  <button
                    className="btn btn-notion w-100 btn-lg mb-3"
                    onClick={() => navigate(routeTo.learning(course.slug))}
                  >
                    Vào học
                  </button>
                </>
              ) : course.price === 0 ? (
                <button
                  className="btn btn-notion w-100 btn-lg mb-3"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? 'Đang xử lý...' : 'Mua ngay'}
                </button>
              ) : (
                <>
                  {isInCart(course.id) ? (
                    <button
                      className="btn btn-success w-100 btn-lg mb-2"
                      onClick={() => navigate(ROUTE_PATHS.cart)}
                    >
                      Đã có trong giỏ hàng
                    </button>
                  ) : (
                    <button className="btn btn-notion w-100 btn-lg mb-2" onClick={handleAddToCart}>
                      Thêm vào giỏ hàng
                    </button>
                  )}
                  <button className="btn btn-outline-notion w-100 mb-3" onClick={handleBuyNow}>
                    Mua ngay
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      </main>

      {preview && (
        <CoursePreviewModal
          lessonTitle={preview.lesson.title}
          videos={playableVideos(preview.lesson)}
          initialVideoId={preview.videoId}
          onClose={() => setPreview(null)}
        />
      )}

    </div>
  );
};

export default CourseDetailPage;
