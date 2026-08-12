import { generatePath } from 'react-router-dom';

export const ROUTE_PATHS = {
  home: '/',
  homeAlias: '/home',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',

  courses: '/courses',
  courseDetail: '/courses/:slug',
  myCourses: '/my-courses',
  learning: '/courses/:slug/learn',
  learningLecture: '/courses/:slug/learn/lecture/:videoId',
  learningQuiz: '/courses/:slug/learn/quiz/:quizLessonId',
  cart: '/cart',
  paymentResult: '/payment/result',

  profile: '/profile',
  profileInstructor: '/profile/instructors/:id',
  profileChangePassword: '/profile/change-password',

  instructorRoot: '/instructor',
  instructorCourses: '/instructor/courses',
  instructorCourseCreate: '/instructor/courses/new',
  instructorCourseBuild: '/instructor/courses/:id/build',
  instructorCourseEdit: '/instructor/courses/:id/edit',
  instructorStats: '/instructor/stats',

  adminRoot: '/admin',
  adminLogin: '/admin/login',
  adminForgotPassword: '/admin/forgot-password',
  adminCourses: '/admin/courses',
  adminUsers: '/admin/users',
  adminInstructorsLegacy: '/admin/instructors',
  adminCategories: '/admin/categories',
  adminStats: '/admin/stats',
  adminProfile: '/admin/profile',
  adminProfileChangePassword: '/admin/profile/change-password',
} as const;

export const PROFILE_ROUTE_SEGMENTS = {
  instructor: 'instructors/:id',
  changePassword: 'change-password',
} as const;

export const ROUTE_MATCH_PATTERNS = {
  coursesArea: `${ROUTE_PATHS.courses}/*`,
  learningArea: `${ROUTE_PATHS.learning}/*`,
  instructorArea: `${ROUTE_PATHS.instructorRoot}/*`,
  adminArea: `${ROUTE_PATHS.adminRoot}/*`,
} as const;

const asPathParam = (value: number | string): string => String(value);

export const routeTo = {
  courseDetail: (slug: string) =>
    generatePath(ROUTE_PATHS.courseDetail, { slug }),
  learning: (slug: string) =>
    generatePath(ROUTE_PATHS.learning, { slug }),
  learningLecture: (slug: string, videoId: number | string) =>
    generatePath(ROUTE_PATHS.learningLecture, {
      slug,
      videoId: asPathParam(videoId),
    }),
  learningQuiz: (slug: string, quizLessonId: number | string) =>
    generatePath(ROUTE_PATHS.learningQuiz, {
      slug,
      quizLessonId: asPathParam(quizLessonId),
    }),
  profileInstructor: (id: number | string) =>
    generatePath(ROUTE_PATHS.profileInstructor, { id: asPathParam(id) }),
  instructorCourseBuild: (id: number | string) =>
    generatePath(ROUTE_PATHS.instructorCourseBuild, { id: asPathParam(id) }),
  instructorCourseEdit: (id: number | string) =>
    generatePath(ROUTE_PATHS.instructorCourseEdit, { id: asPathParam(id) }),
} as const;
