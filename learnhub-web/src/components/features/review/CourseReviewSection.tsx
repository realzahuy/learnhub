import React from 'react';
import { uiConfig } from '../../../config/uiConfig';
import { PageSkeleton, Pagination, StarRating, UserAvatar } from '../../common';
import { RatingSummary } from '../../../types/review.types';
import { formatRelativeDate } from '../../../utils';
import { useCourseReviews } from './useCourseReviews';
import './CourseReviewSection.css';

interface CourseReviewSectionProps {
  slug: string;

  initialSummary?: RatingSummary;

  isEnrolled: boolean;

}

const CourseReviewSection: React.FC<CourseReviewSectionProps> = ({
  slug,
  initialSummary,
  isEnrolled,
}) => {
  const {
    isAuthenticated, page, setPage, summary, reviewPage, reviews, myReview, isLoading,
    formRating, setFormRating, formComment, setFormComment, isEditing, setIsEditing,
    isSubmitting, handleSubmit, handleDelete, startEditing,
  } = useCourseReviews(slug, initialSummary);

  const total = summary?.totalReviews ?? 0;

  return (
    <div className="course-content-card">
      <h2 className="h4 fw-bold mb-3">Đánh giá từ học viên</h2>

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
            <div className="rating-summary__total">
              {total.toLocaleString(uiConfig.formatting.locale)} đánh giá
            </div>
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

      <div className="list-loading-status" role="status">
        {isLoading && reviewPage ? 'Đang cập nhật…' : ''}
      </div>
      <div aria-busy={isLoading}>
        {isLoading && !reviewPage ? (
          <PageSkeleton variant="list" count={3} />
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
                    {review.updatedAt !== review.createdAt && ' · đã chỉnh sửa'}
                  </span>
                </div>

                {review.comment && <p className="review-item__comment">{review.comment}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && reviews.length === 0 && total > 0 && (
        <p className="review-empty mb-0">Không có đánh giá nào ở trang này.</p>
      )}

      <Pagination
        currentPage={page}
        totalPages={reviewPage?.totalPages ?? 0}
        isFirst={reviewPage?.first ?? true}
        isLast={reviewPage?.last ?? true}
        onPageChange={setPage}
      />
    </div>
  );
};

export default CourseReviewSection;
