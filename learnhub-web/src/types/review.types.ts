
export interface Review {
  id: number;
  rating: number;

  comment: string | null;
  userId: number;
  userFullName: string;
  userAvatar: string | null;
  createdAt: string;

  updatedAt: string;

  mine: boolean;
}

export interface RatingSummary {

  average: number;
  totalReviews: number;

  distribution: Record<string, number>;
}

export interface ReviewPayload {
  rating: number;

  comment?: string;
}

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
