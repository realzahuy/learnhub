import React, { useCallback, useEffect, useState } from 'react';
import { Pagination, StarRating, UserAvatar } from '../../common';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { reviewService } from '../../../services/api/review.service';
import { RatingSummary, Review } from '../../../types/review.types';
import { formatRelativeDate, getApiErrorMessage } from '../../../utils';
import './CourseReviewSection.css';

interface CourseReviewSectionProps {
  slug: string;

  initialSummary?: RatingSummary;

  isEnrolled: boolean;

  onSummaryChange?: (summary: RatingSummary) => void;
}

const PAGE_SIZE = 5;

const CourseReviewSection: React.FC<CourseReviewSectionProps> = ({
  slug,
  initialSummary,
  isEnrolled,
  onSummaryChange,
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState<RatingSummary | null>(initialSummary ?? null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFirst, setIsFirst] = useState(true);
  const [isLast, setIsLast] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const [myReview, setMyReview] = useState<Review | null>(null);

  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReviews = useCallback(
    async (targetPage: number) => {
      setIsLoading(true);
      try {
        const data = await reviewService.getCourseReviews(slug, targetPage, PAGE_SIZE);
        setReviews(data.content);
        setPage(data.pageNumber);
        setTotalPages(data.totalPages);
        setIsFirst(data.first);
        setIsLast(data.last);
      } catch (error) {
        showToast(getApiErrorMessage(error, 'Không tải được danh sách đánh giá'), 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [slug, showToast]
  );

  const refreshSummary = useCallback(async () => {
    try {
      const next = await reviewService.getCourseSummary(slug);
      setSummary(next);
      onSummaryChange?.(next);
    } catch {

    }
  }, [slug, onSummaryChange]);

  useEffect(() => {
    loadReviews(0);
    if (initialSummary) {
      setSummary(initialSummary);
    } else {
      setSummary(null);
      refreshSummary();
    }
  }, [initialSummary, loadReviews, refreshSummary]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMyReview(null);
      return;
    }

    reviewService
      .getMyReview(slug)
      .then((review) => {
        setMyReview(review);
        if (review) {
          setFormRating(review.rating);
          setFormComment(review.comment ?? '');
        }
      })
      .catch(() => {

        setMyReview(null);
      });
  }, [slug, isAuthenticated]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (formRating < 1) {
      showToast('Vui lòng chọn số sao', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await reviewService.saveReview(slug, {
        rating: formRating,
        comment: formComment.trim() || undefined,
      });

      setMyReview(saved);
      setIsEditing(false);
      showToast(myReview ? 'Đã cập nhật đánh giá' : 'Cảm ơn bạn đã đánh giá');

      await Promise.all([loadReviews(0), refreshSummary()]);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không gửi được đánh giá'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await reviewService.deleteMyReview(slug);
      setMyReview(null);
      setFormRating(0);
      setFormComment('');
      setIsEditing(false);
      showToast('Đã xóa đánh giá');

      await Promise.all([loadReviews(0), refreshSummary()]);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Không xóa được đánh giá'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (myReview) {
      setFormRating(myReview.rating);
      setFormComment(myReview.comment ?? '');
    }
    setIsEditing(true);
  };

  const total = summary?.totalReviews ?? 0;

  return (
    <div className="course-content-card">
      <h2 className="h4 fw-bold mb-3">Đánh giá từ học viên</h2>

      { }
      {total === 0 ? (
        <p className="text-muted mb-0">
          Khóa học chưa có đánh giá nào.
          {isEnrolled && ' Bạn là người đầu tiên nhé!'}
        </p>
      ) : (
        <div className="rating-summary mb-4">
          <div className="rating-summary__score">
            <div className="rating-summary__average">{summary!.average.toFixed(1)}</div>
            <StarRating value={summary!.average} size="md" />
            <div className="rating-summary__total">{total.toLocaleString('vi-VN')} đánh giá</div>
          </div>

          <div className="rating-summary__bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary!.distribution[String(star)] ?? 0;

              const percent = (count / total) * 100;

              return (
                <div className="rating-bar" key={star}>
                  <span className="rating-bar__label">{star} sao</span>
                  <span className="rating-bar__track">
                    <span className="rating-bar__fill" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="rating-bar__count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {

}
      {!isAuthenticated ? (
        <p className="review-gate mb-4">Đăng nhập và ghi danh khóa học để viết đánh giá.</p>
      ) : !isEnrolled ? (
        <p className="review-gate mb-4">
          Chỉ học viên đã ghi danh mới được đánh giá.
        </p>
      ) : myReview && !isEditing ? (
        <div className="review-form mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <span className="fw-semibold">Đánh giá của bạn:</span>
              <StarRating value={myReview.rating} size="md" />
            </div>
            <div className="review-item__actions m-0">
              <button type="button" className="review-item__action" onClick={startEditing}>
                Chỉnh sửa
              </button>
              <button
                type="button"
                className="review-item__action review-item__action--danger"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Xóa
              </button>
            </div>
          </div>
          {myReview.comment && <p className="review-item__comment">{myReview.comment}</p>}
        </div>
      ) : (
        <form className="review-form mb-4" onSubmit={handleSubmit}>
          <div className="review-form__stars">
            <span className="fw-semibold">Bạn thấy khóa học thế nào?</span>
            <StarRating value={formRating} onChange={setFormRating} size="lg" />
          </div>

          <textarea
            className="form-control mb-3"
            placeholder="Chia sẻ cảm nhận..."
            maxLength={2000}
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
          />

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-notion" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : myReview ? 'Cập nhật' : 'Gửi đánh giá'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn btn-outline-notion"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      )}

      { }
      {isLoading ? (
        <p className="review-empty mb-0">Đang tải đánh giá...</p>
      ) : (
        reviews.map((review) => (
          <div className="review-item" key={review.id}>
            <UserAvatar avatar={review.userAvatar} fullName={review.userFullName} size="md" />

            <div className="review-item__body">
              <div className="review-item__name">{review.userFullName}</div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <StarRating value={review.rating} size="sm" />
                <span className="review-item__meta">
                  {formatRelativeDate(review.createdAt)}
                  {
}
                  {review.updatedAt !== review.createdAt && ' · đã chỉnh sửa'}
                </span>
              </div>

              {review.comment && <p className="review-item__comment">{review.comment}</p>}
            </div>
          </div>
        ))
      )}

      {!isLoading && reviews.length === 0 && total > 0 && (
        <p className="review-empty mb-0">Không có đánh giá nào ở trang này.</p>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        isFirst={isFirst}
        isLast={isLast}
        onPageChange={loadReviews}
      />
    </div>
  );
};

export default CourseReviewSection;
