import { matchPath, useLocation } from 'react-router-dom';
import PageSkeleton, { PageSkeletonVariant } from '../common/PageSkeleton';
import BackButton from '../common/BackButton';
import { ROUTE_MATCH_PATTERNS, ROUTE_PATHS } from '../../routes/paths';
import { uiConfig } from '../../config/uiConfig';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import { InstructorCourse } from '../../types/course.types';
import CourseBuilderSkeleton from '../features/instructor/CourseBuilderSkeleton';
import '../../pages/course/CoursesPage.css';
import '../../pages/user/MyCoursesPage.css';
import '../../pages/user/ProfilePage.css';
import '../../pages/instructor/InstructorProfilePage.css';
import '../../pages/admin/AdminProfilePage.css';
import '../../pages/instructor/InstructorCoursesPage.css';
import '../../pages/instructor/InstructorCourseEditPage.css';
import '../../pages/admin/adminShared.css';
import '../../pages/admin/AdminCategoriesPage.css';
import './RouteLoading.css';

const Control = () => <span className="route-skeleton-control" />;

const RouteLoading = () => {
  const { pathname } = useLocation();
  const matches = (path: string) => Boolean(matchPath(path, pathname));
  let variant: PageSkeletonVariant | undefined;
  let count: number | undefined;
  let cardColumnClassName: string | undefined;
  let className: string | undefined;
  const buildMatch = matchPath(ROUTE_PATHS.instructorCourseBuild, pathname);
  if (buildMatch || matches(ROUTE_PATHS.instructorCourseCreate)) {
    const course = buildMatch ? queryClient.getQueryData<InstructorCourse>(
      queryKeys.instructorCourses.detail(Number(buildMatch.params.id))
    ) : undefined;
    return <CourseBuilderSkeleton reopening={Boolean(buildMatch)} step={buildMatch ? 1 : 0} status={course?.status} />;
  }

  if (matches(ROUTE_PATHS.courses)) {
    variant = 'cards';
    count = uiConfig.pagination.coursePageSize;
    cardColumnClassName = 'col-12 col-sm-6 col-md-4 col-lg-3';
    className = 'app-skeleton-catalog';
  } else if (matches(ROUTE_PATHS.myCourses)) {
    variant = 'cards';
    count = uiConfig.pagination.coursePageSize;
    cardColumnClassName = 'col-12 col-sm-6 col-lg-4 col-xl-3';
    className = 'app-skeleton-my-courses';
  } else if (matches(ROUTE_PATHS.instructorCourses)) {
    variant = 'cards';
    count = uiConfig.pagination.coursePageSize;
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
  } else if (matches(ROUTE_PATHS.instructorCourseEdit)) {
    variant = 'course-form';
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

  if (!variant) return <div className="route-loading-status" role="status">Đang tải trang…</div>;

  const skeleton = (
    <PageSkeleton
      variant={variant}
      count={count}
      cardColumnClassName={cardColumnClassName}
      className={className}
    />
  );

  if (variant === 'detail' || variant === 'learning') return skeleton;

  const toolbar = matches(ROUTE_PATHS.courses) ? (
    <div className="courses-toolbar app-skeleton" aria-hidden="true">
      <div className="courses-filter"><label>Danh mục</label><Control /></div>
      <div className="courses-filter"><label>Sắp xếp</label><Control /></div>
    </div>
  ) : matches(ROUTE_PATHS.myCourses) ? (
    <div className="my-courses-toolbar app-skeleton" aria-hidden="true">
      <div className="my-courses-category"><Control /></div>
      <div className="my-courses-search"><Control /></div>
    </div>
  ) : matches(ROUTE_PATHS.instructorCourses) ? (
    <div className="instructor-toolbar mb-4 app-skeleton" aria-hidden="true">
      <span className="route-skeleton-create" />
      <div className="instructor-toolbar-filters">
        <div className="instructor-dropdown"><Control /></div>
        <div className="instructor-dropdown"><Control /></div>
        <div className="instructor-search"><Control /></div>
      </div>
    </div>
  ) : variant === 'table' || variant === 'course-table' ? (
    <div className="admin-toolbar app-skeleton" aria-hidden="true">
      <div className="admin-dropdown"><Control /></div>
      {variant === 'course-table' && <div className="admin-dropdown"><Control /></div>}
      <div className="admin-search"><Control /></div>
    </div>
  ) : null;

  const body = (
    <>
      {toolbar}
      {toolbar && <div className="list-loading-status" aria-hidden="true" />}
      {variant === 'categories' && <div className="admin-category-create app-skeleton" aria-hidden="true"><Control /><span className="route-skeleton-create" /></div>}
      {variant === 'course-form' && <div className="course-edit-heading"><h1 className="course-edit-title">Chỉnh sửa khóa học</h1></div>}
      {skeleton}
    </>
  );
  if (matches(ROUTE_PATHS.adminProfile)) return <div className="admin-profile-wrap">{body}</div>;
  if (pathname.startsWith(`${ROUTE_PATHS.adminRoot}/`)) return body;
  if (variant === 'profile') return <main className="profile-main"><BackButton fallback={ROUTE_PATHS.home} /><div className="container py-5">{body}</div></main>;
  if (variant === 'instructor-profile') return <div className="instructor-profile"><BackButton fallback={ROUTE_PATHS.courses} /><div className="container">{body}</div></div>;
  const mainClass = matches(ROUTE_PATHS.courses) ? 'courses-main'
    : matches(ROUTE_PATHS.myCourses) ? 'my-courses-main'
      : variant === 'course-form' ? 'course-edit-main' : 'instructor-main';
  return <main className={mainClass}><div className={`container ${matches(ROUTE_PATHS.courses) ? 'py-5' : 'py-4'}`}>{body}</div></main>;
};

export default RouteLoading;
