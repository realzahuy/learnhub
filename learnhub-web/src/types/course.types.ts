import type { RatingSummary } from './review.types';

export interface Course {
  id: number;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
  instructorName: string;
  categoryName: string;

  averageRating: number;

  reviewCount: number;
}

export interface RecommendationCard {
  slug: string;
  title: string;
  thumbnail: string | null;
  price: number;
}

export interface PublicVideo {
  id: number;
  title: string;
  durationSeconds: number | null;

  previewUrl: string | null;
}

export interface PublicLesson {
  id: number;
  title: string;
  position: number;
  isPreview: boolean;

  videos: PublicVideo[];

  questionCount: number;
}

export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  price: number;
  instructorId: number;
  instructorName: string;
  instructorAvatar: string | null;
  categoryName: string;
  lessons: PublicLesson[];

  ratingSummary: RatingSummary;

  instructorAverageRating: number;
  instructorReviewCount: number;
}

export interface Category {
  id: number;
  name: string;
}

export type CourseStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  PUBLISHED: 'Đã xuất bản',
  REJECTED: 'Bị từ chối',
};

export interface InstructorCourse {
  id: number;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string | null;
  price: number;
  status: CourseStatus;
  instructorId: number;
  instructorName: string;
  categoryId: number;
  categoryName: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CourseRejectReason {
  id: number;
  comment: string;
  createdAt: string | null;
}

export interface CourseCreatePayload {
  title: string;
  slug?: string;
  shortDescription: string;
  description: string;
  price: number;
  categoryId: number;
  thumbnailFile?: File | null;
}

export interface CourseCreatedResponse {
  id: number;
  title: string;
  price: number;
  thumbnail: string | null;
  shortDescription: string;
  categoryName: string;
}

export interface CourseUpdatePayload {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  categoryId: number;

  thumbnail?: string | null;
  thumbnailFile?: File | null;
}

export interface InstructorCourseQueryParams {
  page?: number;
  size?: number;
  status?: string;
  category?: string;
  search?: string;
}

export type CourseSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating_desc';

export interface CourseQueryParams {
  page?: number;
  size?: number;
  search?: string;
  category?: string;
  sort?: CourseSort;
}
