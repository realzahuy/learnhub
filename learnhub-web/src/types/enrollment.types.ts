
export interface Enrollment {
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  courseSlug: string;
  courseThumbnail: string | null;
  instructorName: string;
  categoryName: string;

  completedLessons: number;
  totalLessons: number;

  enrolledAt: string;
}
