
export interface Enrollment {
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  courseThumbnail: string | null;
  instructorName: string;
  categoryName: string;

  totalLessons: number;

  enrolledAt: string;
}
