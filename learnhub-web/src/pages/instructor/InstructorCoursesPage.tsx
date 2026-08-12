import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Dropdown, DropdownOption, Pagination } from '../../components/common';
import { useNotifications } from '../../context/NotificationContext';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useCategories } from '../../hooks/useCategories';
import { instructorService } from '../../services/api/instructor.service';
import {
  InstructorCourse,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import { formatPrice, formatLongDate } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './InstructorCoursesPage.css';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Tất cả' },
  ...(Object.entries(COURSE_STATUS_LABELS) as Array<[string, string]>).map(([value, label]) => ({
    value,
    label,
  })),
];

const InstructorCoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [pageData, setPageData] = useState<PageResponse<InstructorCourse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastCourseStatusEvent, realtimeConnectionVersion } = useNotifications();

  const currentPage = parseInt(searchParams.get('page') || '0');
  const statusFilter = searchParams.get('status') || '';
  const categoryFilter = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';

  const [localSearch, setLocalSearch] = useState(searchQuery);

  const { categories } = useCategories(true);

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({ value: category.name, label: category.name })),
    ],
    [categories]
  );

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.set('page', '0');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const [pushSearchToUrl] = useDebouncedCallback(
    (value: string) => updateParam('search', value.trim()),
    500
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      pushSearchToUrl(value);
    },
    [pushSearchToUrl]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const next = new URLSearchParams(searchParams);
      next.set('page', page.toString());
      setSearchParams(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await instructorService.getMyCourses({
          page: currentPage,
          size: 12,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          search: searchQuery || undefined,
        });
        if (cancelled) return;
        setCourses(data.content);
        setPageData(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải danh sách khóa học của giảng viên:', err);
        setError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [
    currentPage,
    statusFilter,
    categoryFilter,
    searchQuery,
    lastCourseStatusEvent,
    realtimeConnectionVersion,
  ]);

  const openCourse = useCallback(
    (course: InstructorCourse) => {
      const destination =
        course.status === 'DRAFT' || course.status === 'REJECTED'
          ? routeTo.instructorCourseBuild(course.id)
          : routeTo.instructorCourseEdit(course.id);
      navigate(destination, {
        state: { from: `${location.pathname}${location.search}` },
      });
    },
    [navigate, location.pathname, location.search]
  );

  return (
    <div className="instructor-page">

      <main className="instructor-main">
        <div className="container py-4">
          { }
          <div className="instructor-toolbar mb-4">
            <button
              type="button"
              className="btn-create-course"
              onClick={() => navigate(ROUTE_PATHS.instructorCourseCreate)}
            >
              <i className="bi bi-plus-lg"></i>
              Tạo khóa học mới
            </button>

            {
}
            <div className="instructor-toolbar-filters">
              <Dropdown
                className="instructor-dropdown"
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={(value) => updateParam('status', value)}
                ariaLabel="Lọc theo trạng thái"
              />

              <Dropdown
                className="instructor-dropdown"
                value={categoryFilter}
                options={categoryOptions}
                onChange={(value) => updateParam('category', value)}
                ariaLabel="Lọc theo danh mục"
              />

              <div className="instructor-search">
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  aria-label="Tìm kiếm khóa học"
                />
                <i className="bi bi-search"></i>
              </div>
            </div>
          </div>

          <div
            className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
            aria-busy={loading}
          >
          {loading && pageData && (
            <div className="motion-loading-indicator" role="status">
              <span className="spinner-border text-notion" aria-hidden="true" />
              Äang cáº­p nháº­t
            </div>
          )}

          {loading && !pageData ? (
            <div className="text-center py-5">
              <div className="spinner-border text-notion" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : courses.length === 0 ? (
            <div className="instructor-empty text-center py-5">
              <p className="fs-5 text-muted mb-0">
                {statusFilter || categoryFilter || searchQuery
                  ? 'Không tìm thấy khóa học nào phù hợp.'
                  : 'Bạn chưa có khóa học nào.'}
              </p>
            </div>
          ) : (
            <>
              <div className="row g-4 motion-stagger">
                {courses.map((course) => {
                  const created = formatLongDate(course.createdAt);
                  return (
                    <div key={course.id} className="col-12 col-md-6 col-xl-3">
                      <article
                        className="instructor-course-card h-100"
                        role="button"
                        tabIndex={0}
                        onClick={() => openCourse(course)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openCourse(course);
                          }
                        }}
                      >
                        <div className="instructor-course-thumb">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} />
                          ) : (
                            <div className="instructor-course-thumb-empty" />
                          )}
                          <span
                            className={`instructor-status instructor-status-${course.status.toLowerCase()}`}
                          >
                            {COURSE_STATUS_LABELS[course.status] ?? course.status}
                          </span>

                        </div>

                        <div className="instructor-course-body">
                          <h2 className="instructor-course-title">{course.title}</h2>

                          <p className="instructor-course-meta">
                            <i className="bi bi-tag"></i>
                            {course.categoryName}
                          </p>
                          {created && (
                            <p className="instructor-course-meta">
                              <i className="bi bi-calendar3"></i>
                              {created}
                            </p>
                          )}

                          <div className="instructor-course-footer">
                            <span className="instructor-course-price">{formatPrice(course.price)}</span>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
              {pageData && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pageData.totalPages}
                  isFirst={pageData.first}
                  isLast={pageData.last}
                  onPageChange={handlePageChange}
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

export default InstructorCoursesPage;
