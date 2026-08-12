
export type AdminUserFilter = 'ALL' | 'INSTRUCTOR';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  roles: string[];

  createdAt: string | null;

  lastLogin: string | null;

  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;

  totalStudents: number;
}
