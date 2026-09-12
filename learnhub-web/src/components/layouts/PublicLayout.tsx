import { Suspense } from 'react';
import RouteLoading from './RouteLoading';
import { matchPath, Outlet, useLocation } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import { CartProvider } from '../../context/CartContext';
import Footer from './Footer';
import { ROUTE_MATCH_PATTERNS, ROUTE_PATHS } from '../../routes/paths';
import './SiteLayout.css';

const PublicLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === ROUTE_PATHS.home;
  const contentKey = matchPath(ROUTE_MATCH_PATTERNS.learningArea, pathname) ? 'learning' : pathname;

  return (
    <CartProvider>
      <div className={`site-layout public-layout${isHome ? ' public-layout--home' : ''}`}>
        <PublicHeader />
        <div className="site-layout-content">
          <Suspense key={contentKey} fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </div>
        <Footer />
      </div>
    </CartProvider>
  );
};

export default PublicLayout;
