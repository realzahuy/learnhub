import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import HomePage from '../pages/home/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import CourseDetailPage from '../pages/course/CourseDetailPage';
import CoursesPage from '../pages/course/CoursesPage';
import CartPage from '../pages/cart/CartPage';
import PaymentResultPage from '../pages/payment/PaymentResultPage';
import MyCoursesPage from '../pages/user/MyCoursesPage';
import LearnPage from '../pages/learn/LearnPage';
import ProfilePage from '../pages/user/ProfilePage';
import ProfileLayout from '../pages/user/ProfileLayout';
import ChangePasswordPage from '../pages/user/ChangePasswordPage';
import InstructorCoursesPage from '../pages/instructor/InstructorCoursesPage';
import InstructorCourseEditPage from '../pages/instructor/InstructorCourseEditPage';
import InstructorCourseCreatePage from '../pages/instructor/InstructorCourseCreatePage';
import InstructorStatsPage from '../pages/instructor/InstructorStatsPage';
import InstructorProfilePage from '../pages/instructor/InstructorProfilePage';
import AdminLoginPage from '../pages/admin/AdminLoginPage';
import AdminStatsPage from '../pages/admin/AdminStatsPage';
import AdminCoursesPage from '../pages/admin/AdminCoursesPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
import AdminChangePasswordPage from '../pages/admin/AdminChangePasswordPage';
import AdminForgotPasswordPage from '../pages/admin/AdminForgotPasswordPage';
import AdminLayout from '../pages/admin/AdminLayout';
import { InstructorLayout, PublicLayout } from '../components/layouts';
import ChatbotWidget from '../components/features/chat/ChatbotWidget';
import { ROLE_ADMIN, ROLE_INSTRUCTOR } from '../types/auth.types';
import RequireRole from './RequireRole';
import { PROFILE_ROUTE_SEGMENTS, ROUTE_PATHS } from './paths';

const LearnerChatbotLayout = () => (
  <>
    <Outlet />
    <ChatbotWidget />
  </>
);

const AppRoutes = () => {
  return (
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
  );
};

export default AppRoutes;
