import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { InstructorNotificationProvider } from '../../context/InstructorNotificationContext';
import './SiteLayout.css';

const ChatbotWidget = lazy(() => import('../features/chat/ChatbotWidget'));

const InstructorLayout = () => (
  <InstructorNotificationProvider>
    <div className="site-layout instructor-layout">
      <Header />
      <div className="site-layout-content">
        <Outlet />
      </div>
      <Footer />
      <Suspense fallback={null}>
        <ChatbotWidget />
      </Suspense>
    </div>
  </InstructorNotificationProvider>
);

export default InstructorLayout;
