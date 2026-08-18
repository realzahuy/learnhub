
export type AdminUserFilter = 'ALL' | 'INSTRUCTOR' | 'LOCKED';
export type AccountStatus = 'ACTIVE' | 'LOCKED';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;
  accountStatus: AccountStatus;
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
