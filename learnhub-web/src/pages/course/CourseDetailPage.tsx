import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CourseCurriculum,
  CourseHero,
  CoursePreviewModal,
  InstructorCard,
} from '../../components/features/course';
import { CourseReviewSection } from '../../components/features/review';
import { courseService } from '../../services/api/course.service';
import { CourseDetail, PublicLesson, PublicVideo } from '../../types/course.types';
import { RatingSummary } from '../../types/review.types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_METHOD_MOMO, paymentService } from '../../services/api/payment.service';
import { enrollmentService } from '../../services/api/enrollment.service';
import { getApiErrorMessage } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './CourseDetailPage.css';

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart, isInCart, removeFromCart } = useCart();
  const { showToast } = useToast();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEnrolled, setIsEnrolled] = useState(false);

  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const [preview, setPreview] = useState<{ lesson: PublicLesson; videoId: number } | null>(null);

  const [ratingOverride, setRatingOverride] = useState<RatingSummary | null>(null);
  const averageRating = ratingOverride?.average ?? course?.ratingSummary.average ?? 0;
  const reviewCount = ratingOverride?.totalReviews ?? course?.ratingSummary.totalReviews ?? 0;

  const reviewsRef = useRef<HTMLDivElement>(null);

  const scrollToReviews = () =>
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const playableVideos = (lesson: PublicLesson): PublicVideo[] =>
    lesson.videos.filter((video) => video.previewUrl);

  const openPreview = (lesson: PublicLesson, videoId: number) =>
    setPreview({ lesson, videoId });

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;

      try {
        setIsLoading(true);
        setThumbnailFailed(false);
        setRatingOverride(null);
        const data = await courseService.getCourseBySlug(slug);
        setCourse(data);
      } catch (err: any) {
        console.error('Không thể tải khóa học:', err);
        setError('Không thể tải thông tin khóa học. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [slug]);

  useEffect(() => {
    if (!isAuthenticated || !course) {
      setIsEnrolled(false);
      return;
    }

    let cancelled = false;

    enrollmentService
      .checkEnrolled(course.id)
      .then((enrolled) => {
        if (!cancelled) setIsEnrolled(enrolled);
      })
      .catch((err) => {

        console.error('Không thể kiểm tra trạng thái ghi danh:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, course]);

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
      const payment = await paymentService.create({
        courseIds: [course.id],
        paymentMethod: PAYMENT_METHOD_MOMO,
      });

      removeFromCart(course.id);

      if (payment.payUrl) {
        window.location.href = payment.payUrl;
        return;
      }

      showToast(payment.message || 'Đã thêm khóa học vào tài khoản.', 'success');
      navigate(ROUTE_PATHS.myCourses);
    } catch (err) {
      console.error('Không thể tạo đơn thanh toán:', err);
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
    return (
      <div className="course-detail-page">
        <main className="course-detail-main">
          <div className="container py-5 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-3 text-muted">Đang tải thông tin khóa học...</p>
          </div>
        </main>
      </div>
    );
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

      <main className="course-detail-main motion-content-enter">
      { }
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

      { }
      <div className="container my-5">
        <div className="row">
          { }
          <div className="col-lg-8">
            <div className="course-content-card mb-4">
              <h2 className="h4 fw-bold mb-3">Mô tả khóa học</h2>
              <div className="course-description">{course.description}</div>
            </div>

            { }
            <CourseCurriculum lessons={course.lessons} onOpenPreview={openPreview} />

            <InstructorCard course={course} />

            <div ref={reviewsRef}>
              <CourseReviewSection
                slug={course.slug}
                initialSummary={course.ratingSummary}
                isEnrolled={isEnrolled}
                onSummaryChange={setRatingOverride}
              />
            </div>
          </div>

          { }
          <div className="col-lg-4">
            <div className="price-card sticky-top">
              <div className="price-header text-center mb-4">
                <h3 className="display-4 fw-bold text-notion mb-0">
                  {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString()}đ`}
                </h3>
              </div>

              {
}
              {isEnrolled ? (
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
                  {isEnrolling ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Đăng ký học ngay'
                  )}
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
