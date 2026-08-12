import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { ROUTE_PATHS } from '../../routes/paths';
import './SiteLayout.css';

const PublicLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTE_PATHS.home;

  return (
    <div className={`site-layout public-layout${isHome ? ' public-layout--home' : ''}`}>
      <Header />
      <div className="site-layout-content">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default PublicLayout;
