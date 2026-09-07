import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { uiConfig } from '../../../config/uiConfig';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { reviewService } from '../../../services/api/review.service';
import { RatingSummary, Review } from '../../../types/review.types';
import { getApiErrorMessage } from '../../../utils';
import { queryClient } from '../../../query/queryClient';
import { queryKeys } from '../../../query/queryKeys';

export const useCourseReviews = (slug: string, initialSummary?: RatingSummary) => {
  const { userId } = useAuth();
  const isAuthenticated = userId !== null;
  const { showToast } = useToast();

  const [page, setPage] = useState(0);

  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contextRef = useRef({ slug, userId });
  contextRef.current = { slug, userId };

  const summaryQuery = useQuery<RatingSummary>({
    queryKey: queryKeys.reviews.summary(slug),
    queryFn: ({ signal }) => reviewService.getCourseSummary(slug, signal),
    initialData: initialSummary,
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews.list(slug, page, userId),
    queryFn: ({ signal }) => reviewService.getCourseReviews(
      slug,
      page,
      uiConfig.pagination.reviewPageSize,
      signal
    ),
    placeholderData: keepPreviousData,
  });
  const myReviewQuery = useQuery<Review | null>({
    queryKey: queryKeys.reviews.mine(slug, userId),
    enabled: isAuthenticated,
    queryFn: ({ signal }) => reviewService.getMyReview(slug, signal),
  });
  const summary = summaryQuery.data ?? null;
  const reviewPage = reviewsQuery.data ?? null;
  const reviews = reviewPage?.content ?? [];
  const myReview = myReviewQuery.data ?? null;
  const isLoading = reviewsQuery.isFetching;

  useEffect(() => {
    setPage(0);
    setIsSubmitting(false);
  }, [slug, userId]);

  useEffect(() => {
    if (summaryQuery.error) {
      showToast(getApiErrorMessage(summaryQuery.error, 'Không tải được tổng quan đánh giá'), 'error');
    }
  }, [showToast, summaryQuery.error]);

  useEffect(() => {
    if (reviewsQuery.error) {
      showToast(getApiErrorMessage(reviewsQuery.error, 'Không tải được danh sách đánh giá'), 'error');
    }
  }, [reviewsQuery.error, showToast]);

  useEffect(() => {
    if (myReviewQuery.error) {
      showToast(getApiErrorMessage(myReviewQuery.error, 'Không tải được đánh giá của bạn'), 'error');
    }
  }, [myReviewQuery.error, showToast]);

  useEffect(() => {
    setFormRating(0);
    setFormComment('');
    setIsEditing(false);
    if (myReview) {
      setFormRating(myReview.rating);
      setFormComment(myReview.comment ?? '');
    }
  }, [myReview, slug, userId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (formRating < 1) {
      showToast('Vui lòng chọn số sao', 'error');
      return;
    }

    const requestSlug = slug;
    const requestUserId = userId;
    const updating = myReview !== null;
    setIsSubmitting(true);
    try {
      const saved = await reviewService.saveReview(slug, {
        rating: formRating,
        comment: formComment.trim() || undefined,
      });
      if (contextRef.current.slug !== requestSlug
          || contextRef.current.userId !== requestUserId) return;

      queryClient.setQueryData(queryKeys.reviews.mine(slug, userId), saved);
      setIsEditing(false);
      showToast(updating ? 'Đã cập nhật đánh giá' : 'Cảm ơn bạn đã đánh giá');

      setPage(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byCourse(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.detail(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all }),
      ]);
    } catch (error) {
      if (contextRef.current.slug !== requestSlug
          || contextRef.current.userId !== requestUserId) return;
      showToast(getApiErrorMessage(error, 'Không gửi được đánh giá'), 'error');
    } finally {
      if (contextRef.current.slug === requestSlug
          && contextRef.current.userId === requestUserId) setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    const requestSlug = slug;
    const requestUserId = userId;
    setIsSubmitting(true);
    try {
      await reviewService.deleteMyReview(slug);
      if (contextRef.current.slug !== requestSlug
          || contextRef.current.userId !== requestUserId) return;
      queryClient.setQueryData(queryKeys.reviews.mine(slug, userId), null);
      setFormRating(0);
      setFormComment('');
      setIsEditing(false);
      showToast('Đã xóa đánh giá');

      setPage(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.byCourse(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.detail(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all }),
      ]);
    } catch (error) {
      if (contextRef.current.slug !== requestSlug
          || contextRef.current.userId !== requestUserId) return;
      showToast(getApiErrorMessage(error, 'Không xóa được đánh giá'), 'error');
    } finally {
      if (contextRef.current.slug === requestSlug
          && contextRef.current.userId === requestUserId) setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (myReview) {
      setFormRating(myReview.rating);
      setFormComment(myReview.comment ?? '');
    }
    setIsEditing(true);
  };

  return {
    isAuthenticated, page, setPage, summary, reviewPage, reviews, myReview, isLoading,
    formRating, setFormRating, formComment, setFormComment, isEditing, setIsEditing,
    isSubmitting, handleSubmit, handleDelete, startEditing,
  };
};
