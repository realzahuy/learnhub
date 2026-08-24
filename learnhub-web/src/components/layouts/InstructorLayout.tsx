import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ChatbotWidget from '../features/chat/ChatbotWidget';
import './SiteLayout.css';

const InstructorLayout = () => (
  <div className="site-layout instructor-layout">
    <Header />
    <div className="site-layout-content">
      <Outlet />
    </div>
    <Footer />
    <ChatbotWidget />
  </div>
);

export default InstructorLayout;
