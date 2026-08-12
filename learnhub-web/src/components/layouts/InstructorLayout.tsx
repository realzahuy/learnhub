import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import './SiteLayout.css';

const InstructorLayout = () => (
  <div className="site-layout instructor-layout">
    <Header />
    <div className="site-layout-content">
      <Outlet />
    </div>
    <Footer />
  </div>
);

export default InstructorLayout;
