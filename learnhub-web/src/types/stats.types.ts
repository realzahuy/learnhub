
export interface InstructorOverview {
  totalStudents: number;
  totalRevenue: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;
  enrollmentsCurrentPeriod: number;
  enrollmentsPreviousPeriod: number;
  revenueCurrentPeriod: number;
  revenuePreviousPeriod: number;

  periodDays: number;
}

export interface StatsChartPoint {

  label: string;
}

export type StatsGranularity = 'day' | 'month' | 'quarter';

export const STATS_GRANULARITY_LABELS: Record<StatsGranularity, string> = {
  day: 'Ngày',
  month: 'Tháng',
  quarter: 'Quý',
};

export interface StatsPoint extends StatsChartPoint {
  enrollments: number;

  students: number;
  revenue: number;
}

export interface InstructorTimeSeries {
  granularity: StatsGranularity;
  from: string;
  to: string;
  points: StatsPoint[];
}

export interface AdminOverview {

  totalUsers: number;
  totalInstructors: number;

  totalStudents: number;
  totalRevenue: number;
  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;
  newUsersCurrentPeriod: number;
  newUsersPreviousPeriod: number;
  revenueCurrentPeriod: number;
  revenuePreviousPeriod: number;

  periodDays: number;
}

export interface AdminStatsPoint extends StatsChartPoint {

  users: number;

  instructors: number;
  revenue: number;
}

export interface AdminTimeSeries {
  granularity: StatsGranularity;
  from: string;
  to: string;
  points: AdminStatsPoint[];
}
