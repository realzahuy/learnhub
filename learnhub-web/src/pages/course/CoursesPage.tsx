import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { uiConfig } from '../../config/uiConfig';
import { useCategories } from '../../hooks/useCategories';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import {
  CourseThumbnail,
  Dropdown,
  DropdownOption,
  PageSkeleton,
  Pagination,
  StarRating,
} from '../../components/common';
import { formatPrice } from '../../utils';
import { courseService } from '../../services/api/course.service';
import { Course, CourseSort } from '../../types/course.types';
import { queryKeys } from '../../query/queryKeys';
import { routeTo } from '../../routes/paths';
import './CoursesPage.css';

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'rating_desc', label: 'Xếp hạng cao nhất' },
];

const CoursesPage = () => {
  const navigate = useNavigate();
  const {
    searchParams,
    page: currentPage,
    search: searchQuery,
    setPage,
    setParam,
  } = usePagedSearchParams();
  const { categories } = useCategories();

  const categoryFilter = searchParams.get('category') || '';
  const requestedSort = searchParams.get('sort') || 'newest';
  const sortFilter: CourseSort = SORT_OPTIONS.some((option) => option.value === requestedSort)
    ? requestedSort as CourseSort
    : 'newest';

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({
        value: category.name,
        label: category.name,
      })),
    ],
    [categories]
  );

  const handleFilterChange = useCallback(
    (key: 'category' | 'sort', value: string) => {
      const isDefault = (key === 'category' && !value)
        || (key === 'sort' && value === 'newest');
      setParam(key, isDefault ? '' : value);
    },
    [setParam]
  );

  const handleCourseClick = (slug: string) => {
    navigate(routeTo.courseDetail(slug));
  };

  const courseFilters = {
    page: currentPage,
    search: searchQuery || undefined,
    category: categoryFilter || undefined,
    sort: sortFilter,
  };
  const courseQuery = useQuery({
    queryKey: queryKeys.publishedCourses.list(courseFilters),
    queryFn: ({ signal }) => courseService.getPublishedCourses(
      { ...courseFilters, size: uiConfig.pagination.coursePageSize },
      signal
    ),
    placeholderData: keepPreviousData,
  });
  const pageData = courseQuery.data ?? null;
  const courses: Course[] = pageData?.content ?? [];
  const loading = courseQuery.isFetching;
  const error = courseQuery.error
    ? 'Không thể tải danh sách khóa học. Vui lòng thử lại sau.'
    : null;

  const getCategoryColor = (categoryName: string) => {
    const colors = [
      { bg: '#E3F2FD', text: '#1565C0' },
      { bg: '#F3E5F5', text: '#6A1B9A' },
      { bg: '#E8F5E9', text: '#2E7D32' },
      { bg: '#FFF3E0', text: '#E65100' },
      { bg: '#FCE4EC', text: '#C2185B' },
      { bg: '#E0F2F1', text: '#00695C' },
      { bg: '#FFF9C4', text: '#F57F17' },
      { bg: '#FFEBEE', text: '#C62828' },
    ];

    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="courses-page">
      <main className="courses-main">
        <div className="container py-5">
          <div className="courses-toolbar">
            <div className="courses-filter">
              <label htmlFor="course-category-filter">Danh mục</label>
              <Dropdown
                id="course-category-filter"
                className="courses-dropdown"
                value={categoryFilter}
                options={categoryOptions}
                onChange={(value) => handleFilterChange('category', value)}
                ariaLabel="Lọc khóa học theo danh mục"
              />
            </div>

            <div className="courses-filter">
              <label htmlFor="course-sort-filter">Sắp xếp</label>
              <Dropdown
                id="course-sort-filter"
                className="courses-dropdown"
                value={sortFilter}
                options={SORT_OPTIONS}
                onChange={(value) => handleFilterChange('sort', value)}
                ariaLabel="Sắp xếp danh sách khóa học"
              />
            </div>
          </div>

          <div
            className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
            aria-busy={loading}
          >
          {loading && !pageData ? (
            <PageSkeleton variant="cards" count={6} />
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted fs-4">Không tìm thấy khóa học nào.</p>
            </div>
          ) : (
            <>
              <div className="row g-4 motion-stagger">
                {courses.map((course) => (
                  <div key={course.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <div
                      className="course-card h-100"
                      onClick={() => handleCourseClick(course.slug)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleCourseClick(course.slug);
                      }}
                    >
                      <div className="course-thumbnail">
                        <CourseThumbnail
                          src={course.thumbnail}
                          alt={course.title}
                          placeholder={<div className="course-thumbnail-placeholder" />}
                        />
                      </div>
                      <div className="course-content">
                        <h3 className="course-title">{course.title}</h3>
                        <p className="course-instructor text-muted mb-2">
                          {course.instructorName}
                        </p>

                        {
}
                        <div className="course-rating-slot mb-2">
                          {course.reviewCount > 0 && (
                            <StarRating
                              value={course.averageRating}
                              size="sm"
                              showValue
                              count={course.reviewCount}
                            />
                          )}
                        </div>

                        <div className="course-card-footer d-flex justify-content-between align-items-center">
                          <span
                            className="badge category-badge"
                            style={{
                              backgroundColor: getCategoryColor(course.categoryName).bg,
                              color: getCategoryColor(course.categoryName).text
                            }}
                          >
                            <i className="bi bi-tag me-1"></i>
                            {course.categoryName}
                          </span>
                          <span className="course-price fw-bold text-notion">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {pageData && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pageData.totalPages}
                  isFirst={pageData.first}
                  isLast={pageData.last}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default CoursesPage;
