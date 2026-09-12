import { matchPath, useLocation } from 'react-router-dom';
import PageSkeleton, { PageSkeletonVariant } from '../common/PageSkeleton';
import { ROUTE_MATCH_PATTERNS, ROUTE_PATHS } from '../../routes/paths';

const RouteLoading = () => {
  const { pathname } = useLocation();
  const matches = (path: string) => Boolean(matchPath(path, pathname));
  let variant: PageSkeletonVariant | undefined;
  let count: number | undefined;
  let cardColumnClassName: string | undefined;
  let className: string | undefined;

  if (matches(ROUTE_PATHS.courses)) {
    variant = 'cards';
    count = 8;
    cardColumnClassName = 'col-12 col-sm-6 col-md-4 col-lg-3';
    className = 'app-skeleton-catalog';
  } else if (matches(ROUTE_PATHS.myCourses)) {
    variant = 'cards';
    count = 8;
    cardColumnClassName = 'col-12 col-sm-6 col-lg-4 col-xl-3';
  } else if (matches(ROUTE_PATHS.instructorCourses)) {
    variant = 'cards';
    count = 8;
    cardColumnClassName = 'col-12 col-md-6 col-xl-3';
    className = 'app-skeleton-instructor-courses';
  } else if (matches(ROUTE_MATCH_PATTERNS.learningArea)) {
    variant = 'learning';
  } else if (matches(ROUTE_PATHS.courseDetail)) {
    variant = 'detail';
  } else if (matches(ROUTE_PATHS.profileInstructor)) {
    variant = 'instructor-profile';
  } else if (matches(ROUTE_PATHS.profile) || matches(ROUTE_PATHS.adminProfile)) {
    variant = 'profile';
  } else if (matches(ROUTE_PATHS.instructorCourseCreate) || matches(ROUTE_PATHS.instructorCourseEdit)) {
    variant = 'course-form';
  } else if (matches(ROUTE_PATHS.instructorCourseBuild)) {
    variant = 'lessons';
    count = 3;
  } else if (matches(ROUTE_PATHS.adminCourses)) {
    variant = 'course-table';
    count = 6;
  } else if (matches(ROUTE_PATHS.adminUsers) || matches(ROUTE_PATHS.adminInstructorsLegacy)) {
    variant = 'table';
    count = 6;
  } else if (matches(ROUTE_PATHS.adminCategories)) {
    variant = 'categories';
    count = 6;
  } else if (matches(ROUTE_PATHS.adminStats) || matches(ROUTE_PATHS.instructorStats)) {
    variant = 'stats';
    count = matches(ROUTE_PATHS.adminStats) ? 5 : 4;
  }

  if (!variant) return null;

  const skeleton = (
    <PageSkeleton
      variant={variant}
      count={count}
      cardColumnClassName={cardColumnClassName}
      className={className}
    />
  );

  return variant === 'detail' || variant === 'learning'
    ? skeleton
    : <div className="container py-4">{skeleton}</div>;
};

export default RouteLoading;
