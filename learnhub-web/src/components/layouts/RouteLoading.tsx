import { matchPath, useLocation } from 'react-router-dom';
import PageSkeleton, { PageSkeletonVariant } from '../common/PageSkeleton';
import { ROUTE_PATHS } from '../../routes/paths';

const RouteLoading = () => {
  const { pathname } = useLocation();
  let variant: PageSkeletonVariant = 'form';
  if ([ROUTE_PATHS.home, ROUTE_PATHS.homeAlias, ROUTE_PATHS.courses, ROUTE_PATHS.myCourses,
    ROUTE_PATHS.instructorCourses].some((path) => matchPath(path, pathname))) {
    variant = 'cards';
  } else if ([ROUTE_PATHS.adminCourses, ROUTE_PATHS.adminUsers].some((path) => matchPath(path, pathname))) {
    variant = 'table';
  } else if ([ROUTE_PATHS.adminStats, ROUTE_PATHS.instructorStats].some((path) => matchPath(path, pathname))) {
    variant = 'stats';
  } else if ([ROUTE_PATHS.adminCategories, ROUTE_PATHS.cart].some((path) => matchPath(path, pathname))) {
    variant = 'list';
  } else if (matchPath(ROUTE_PATHS.courseDetail, pathname) || matchPath(`${ROUTE_PATHS.learning}/*`, pathname)) {
    variant = 'detail';
  }

  return (
    <div className="container py-4" role="status" aria-label="Đang mở trang">
      <PageSkeleton variant={variant} count={6} />
    </div>
  );
};

export default RouteLoading;
