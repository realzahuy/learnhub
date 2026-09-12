import { Outlet, useLocation } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import { CartProvider } from '../../context/CartContext';
import Footer from './Footer';
import { ROUTE_PATHS } from '../../routes/paths';
import './SiteLayout.css';

const PublicLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTE_PATHS.home;

  return (
    <CartProvider>
      <div className={`site-layout public-layout${isHome ? ' public-layout--home' : ''}`}>
        <PublicHeader />
        <div className="site-layout-content">
          <Outlet />
        </div>
        <Footer />
      </div>
    </CartProvider>
  );
};

export default PublicLayout;
