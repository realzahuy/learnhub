import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminCourseDialogs from './AdminCourseDialogs';
import AdminCourseTable from './AdminCourseTable';
import { Dropdown, DropdownOption, Pagination, LoadingScreen } from '../../components/common';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useCategories } from '../../hooks/useCategories';
import { adminService } from '../../services/api/admin.service';
import {
  InstructorCourse,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import { getApiErrorMessage } from '../../utils';
import './AdminCoursesPage.css';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'PENDING', label: COURSE_STATUS_LABELS.PENDING },
  { value: 'PUBLISHED', label: COURSE_STATUS_LABELS.PUBLISHED },
  { value: 'REJECTED', label: COURSE_STATUS_LABELS.REJECTED },
];

const AdminCoursesPage: React.FC = () => {
  const { showToast } = useToast();
  const { lastCourseStatusEvent, realtimeConnectionVersion } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get('status') || 'PENDING';
  const categoryFilter = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '0');

  const [pageData, setPageData] = useState<PageResponse<InstructorCourse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const { categories } = useCategories(true);

  const categoryOptions = useMemo<DropdownOption[]>(
    () => [
      { value: '', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({ value: category.name, label: category.name })),
    ],
    [categories]
  );

  const [processingId, setProcessingId] = useState<number | null>(null);

  const [detailCourse, setDetailCourse] = useState<InstructorCourse | null>(null);

  const [rejectingCourse, setRejectingCourse] = useState<InstructorCourse | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.set('page', '0');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const [pushSearchToUrl] = useDebouncedCallback(
    (value: string) => setParam('search', value.trim()),
    500
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      pushSearchToUrl(value);
    },
    [pushSearchToUrl]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.listCourses({
          status: statusFilter,
          category: categoryFilter || undefined,
          search: searchQuery || undefined,
          page: currentPage,
        });
        if (!cancelled) setPageData(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải danh sách khóa học quản trị:', err);
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
    statusFilter,
    categoryFilter,
    searchQuery,
    currentPage,
    reloadKey,
    lastCourseStatusEvent,
    realtimeConnectionVersion,
  ]);

  const handleApprove = useCallback(
    async (course: InstructorCourse) => {
      setProcessingId(course.id);
      try {
        await adminService.approveCourse(course.id);
        showToast('Đã duyệt khóa học', 'success');
        setDetailCourse(null);

        setReloadKey((k) => k + 1);
      } catch (err) {
        console.error('Duyệt khóa học thất bại:', err);
        showToast(getApiErrorMessage(err, 'Không thể duyệt khóa học. Vui lòng thử lại.'), 'error');
      } finally {
        setProcessingId(null);
      }
    },
    [showToast]
  );

  const openReject = useCallback((course: InstructorCourse) => {
    setRejectingCourse(course);
    setRejectComment('');
    setRejectError(null);
  }, []);

  const submitReject = useCallback(async () => {
    if (!rejectingCourse) return;
    if (!rejectComment.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối');
      return;
    }

    setProcessingId(rejectingCourse.id);
    setRejectError(null);
    try {
      await adminService.rejectCourse(rejectingCourse.id, rejectComment.trim());
      showToast('Đã từ chối khóa học', 'success');
      setRejectingCourse(null);
      setDetailCourse(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Từ chối khóa học thất bại:', err);

      setRejectError(getApiErrorMessage(err, 'Không thể từ chối khóa học. Vui lòng thử lại.'));
    } finally {
      setProcessingId(null);
    }
  }, [rejectingCourse, rejectComment, showToast]);

  const handlePageChange = useCallback(
    (page: number) => {
      setParam('page', page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setParam]
  );

  const courses = pageData?.content ?? [];

  return (
    <>
      <div className="admin-courses">
        { }
        <div className="admin-toolbar">
          <Dropdown
            className="admin-dropdown"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => setParam('status', value)}
            ariaLabel="Lọc theo trạng thái"
          />
          <Dropdown
            className="admin-dropdown"
            value={categoryFilter}
            options={categoryOptions}
            onChange={(value) => setParam('category', value)}
            ariaLabel="Lọc theo danh mục"
          />
          <div className="admin-search">
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

        {loading ? (
          <LoadingScreen />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : courses.length === 0 ? (
          <div className="admin-empty">
            Không có khóa học nào phù hợp.
          </div>
        ) : (
          <>
            <AdminCourseTable courses={courses} onSelect={setDetailCourse} />

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

      <AdminCourseDialogs
        detailCourse={detailCourse}
        rejectingCourse={rejectingCourse}
        processingId={processingId}
        rejectComment={rejectComment}
        rejectError={rejectError}
        onCloseDetail={() => setDetailCourse(null)}
        onApprove={handleApprove}
        onOpenReject={openReject}
        onRejectCommentChange={setRejectComment}
        onCloseReject={() => setRejectingCourse(null)}
        onSubmitReject={submitReject}
      />
    </>
  );
};

export default AdminCoursesPage;
