import { lazy, Suspense } from 'react';
import RouteLoading from './RouteLoading';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import { ROUTE_PATHS } from '../../routes/paths';
import Header from './Header';
import Footer from './Footer';
import { InstructorNotificationProvider } from '../../context/InstructorNotificationContext';
import './SiteLayout.css';

const ChatbotWidget = lazy(() => import('../features/chat/ChatbotWidget'));

const InstructorLayout = () => {
  const { pathname } = useLocation();
  const contentKey = [ROUTE_PATHS.instructorCourseCreate, ROUTE_PATHS.instructorCourseBuild]
    .some((pattern) => matchPath(pattern, pathname)) ? 'course-builder' : pathname;
  return (
    <InstructorNotificationProvider>
      <div className="site-layout instructor-layout">
        <Header />
        <div className="site-layout-content">
          <Suspense key={contentKey} fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </div>
        <Footer />
        <Suspense fallback={null}>
          <ChatbotWidget />
        </Suspense>
      </div>
    </InstructorNotificationProvider>
  );
};

export default InstructorLayout;
