export interface InstructorProfile {
  id: number;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  joinedAt: string;
  averageRating: number;
  totalReviews: number;
  totalStudents: number;
  totalCourses: number;
}
