import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { InstructorLayout, PublicLayout } from '../components/layouts';
import LoadingScreen from '../components/common/LoadingScreen';
import ChatbotWidget from '../components/features/chat/ChatbotWidget';
import { ROLE_ADMIN, ROLE_INSTRUCTOR } from '../types/auth.types';
import RequireRole from './RequireRole';
import { PROFILE_ROUTE_SEGMENTS, ROUTE_PATHS } from './paths';

const HomePage = lazy(() => import('../pages/home/HomePage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const CourseDetailPage = lazy(() => import('../pages/course/CourseDetailPage'));
const CoursesPage = lazy(() => import('../pages/course/CoursesPage'));
const CartPage = lazy(() => import('../pages/cart/CartPage'));
const PaymentResultPage = lazy(() => import('../pages/payment/PaymentResultPage'));
const MyCoursesPage = lazy(() => import('../pages/user/MyCoursesPage'));
const LearnPage = lazy(() => import('../pages/learn/LearnPage'));
const ProfilePage = lazy(() => import('../pages/user/ProfilePage'));
const ProfileLayout = lazy(() => import('../pages/user/ProfileLayout'));
const ChangePasswordPage = lazy(() => import('../pages/user/ChangePasswordPage'));
const InstructorCoursesPage = lazy(() => import('../pages/instructor/InstructorCoursesPage'));
const InstructorCourseEditPage = lazy(() => import('../pages/instructor/InstructorCourseEditPage'));
const InstructorCourseCreatePage = lazy(() => import('../pages/instructor/InstructorCourseCreatePage'));
const InstructorStatsPage = lazy(() => import('../pages/instructor/InstructorStatsPage'));
const InstructorProfilePage = lazy(() => import('../pages/instructor/InstructorProfilePage'));
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage'));
const AdminStatsPage = lazy(() => import('../pages/admin/AdminStatsPage'));
const AdminCoursesPage = lazy(() => import('../pages/admin/AdminCoursesPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage'));
const AdminProfilePage = lazy(() => import('../pages/admin/AdminProfilePage'));
const AdminChangePasswordPage = lazy(() => import('../pages/admin/AdminChangePasswordPage'));
const AdminForgotPasswordPage = lazy(() => import('../pages/admin/AdminForgotPasswordPage'));
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));

const LearnerChatbotLayout = () => (
  <>
    <Outlet />
    <ChatbotWidget />
  </>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route element={<LearnerChatbotLayout />}>
        <Route element={<PublicLayout />}>
          <Route path={ROUTE_PATHS.home} element={<HomePage />} />
          <Route path={ROUTE_PATHS.homeAlias} element={<HomePage />} />
          <Route path={ROUTE_PATHS.login} element={<LoginPage />} />
          <Route path={ROUTE_PATHS.register} element={<RegisterPage />} />
          <Route path={ROUTE_PATHS.forgotPassword} element={<ForgotPasswordPage />} />

          <Route path={ROUTE_PATHS.courses} element={<CoursesPage />} />
          <Route path={ROUTE_PATHS.courseDetail} element={<CourseDetailPage />} />
          <Route path={ROUTE_PATHS.myCourses} element={<MyCoursesPage />} />
          <Route path={ROUTE_PATHS.learning} element={<LearnPage />} />
          <Route path={ROUTE_PATHS.learningLecture} element={<LearnPage />} />
          <Route path={ROUTE_PATHS.learningQuiz} element={<LearnPage />} />
          <Route path={ROUTE_PATHS.cart} element={<CartPage />} />
          <Route path={ROUTE_PATHS.paymentResult} element={<PaymentResultPage />} />

          <Route path={ROUTE_PATHS.profile} element={<ProfileLayout />}>
            <Route index element={<ProfilePage />} />
            <Route
              path={PROFILE_ROUTE_SEGMENTS.instructor}
              element={<InstructorProfilePage />}
            />
            <Route
              path={PROFILE_ROUTE_SEGMENTS.changePassword}
              element={<ChangePasswordPage />}
            />
          </Route>
        </Route>
      </Route>

      { }
      <Route element={<RequireRole role={ROLE_INSTRUCTOR} redirectTo={ROUTE_PATHS.home} />}>
        <Route element={<InstructorLayout />}>
          <Route path={ROUTE_PATHS.instructorCourses} element={<InstructorCoursesPage />} />
          <Route
            path={ROUTE_PATHS.instructorCourseCreate}
            element={<InstructorCourseCreatePage />}
          />
          <Route
            path={ROUTE_PATHS.instructorCourseBuild}
            element={<InstructorCourseCreatePage />}
          />
          <Route
            path={ROUTE_PATHS.instructorCourseEdit}
            element={<InstructorCourseEditPage />}
          />
          <Route path={ROUTE_PATHS.instructorStats} element={<InstructorStatsPage />} />
        </Route>
      </Route>

      { }
      <Route path={ROUTE_PATHS.adminLogin} element={<AdminLoginPage />} />
      <Route element={<AdminLayout />}>
        <Route element={<RequireRole role={ROLE_ADMIN} redirectTo={ROUTE_PATHS.adminLogin} />}>
          <Route path={ROUTE_PATHS.adminStats} element={<AdminStatsPage />} />
          <Route path={ROUTE_PATHS.adminCourses} element={<AdminCoursesPage />} />
          <Route path={ROUTE_PATHS.adminUsers} element={<AdminUsersPage />} />
          <Route
            path={ROUTE_PATHS.adminInstructorsLegacy}
            element={<Navigate to={ROUTE_PATHS.adminUsers} replace />}
          />
          <Route path={ROUTE_PATHS.adminCategories} element={<AdminCategoriesPage />} />
          <Route path={ROUTE_PATHS.adminProfile} element={<AdminProfilePage />} />
          <Route
            path={ROUTE_PATHS.adminProfileChangePassword}
            element={<AdminChangePasswordPage />}
          />
        </Route>
        <Route path={ROUTE_PATHS.adminForgotPassword} element={<AdminForgotPasswordPage />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTE_PATHS.home} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
