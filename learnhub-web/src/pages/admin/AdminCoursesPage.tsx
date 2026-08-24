import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AdminCourseDialogs from './AdminCourseDialogs';
import AdminCourseTable from './AdminCourseTable';
import { Dropdown, DropdownOption, Pagination, LoadingScreen } from '../../components/common';
import { useCourseRealtime } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { useCoalescedRefreshTrigger } from '../../hooks/useCoalescedRefreshTrigger';
import { useCategories } from '../../hooks/useCategories';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { adminService } from '../../services/api/admin.service';
import {
  InstructorCourse,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { PageResponse } from '../../types/pagination.types';
import { getApiErrorMessage } from '../../utils';
import { shouldRefreshAdminCourseList } from '../../utils/courseRealtime';
import './AdminCoursesPage.css';

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'PENDING', label: COURSE_STATUS_LABELS.PENDING },
  { value: 'PUBLISHED', label: COURSE_STATUS_LABELS.PUBLISHED },
  { value: 'REJECTED', label: COURSE_STATUS_LABELS.REJECTED },
];

const AdminCoursesPage: React.FC = () => {
  const { showToast } = useToast();
  const { lastCourseStatusEvent, realtimeReconnectVersion } = useCourseRealtime();
  const {
    searchParams,
    page: currentPage,
    search: searchQuery,
    searchInput: localSearch,
    setPage,
    setParam,
    setSearch,
  } = usePagedSearchParams();

  const statusFilter = searchParams.get('status') || 'PENDING';
  const categoryFilter = searchParams.get('category') || '';

  const [pageData, setPageData] = useState<PageResponse<InstructorCourse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const { refreshVersion, scheduleRefresh } = useCoalescedRefreshTrigger();
  const filtersRef = useRef({ status: statusFilter, category: categoryFilter, search: searchQuery });
  const seenReconnectVersion = useRef(realtimeReconnectVersion);
  filtersRef.current = { status: statusFilter, category: categoryFilter, search: searchQuery };

  useEffect(() => {
    if (lastCourseStatusEvent
        && shouldRefreshAdminCourseList(lastCourseStatusEvent, filtersRef.current)) {
      scheduleRefresh();
    }
  }, [lastCourseStatusEvent, scheduleRefresh]);

  useEffect(() => {
    if (realtimeReconnectVersion === seenReconnectVersion.current) return;
    seenReconnectVersion.current = realtimeReconnectVersion;
    scheduleRefresh();
  }, [realtimeReconnectVersion, scheduleRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.listCourses(
          {
            status: statusFilter,
            category: categoryFilter || undefined,
            search: searchQuery || undefined,
            page: currentPage,
          },
          controller.signal
        );
        if (!controller.signal.aborted) setPageData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Không thể tải danh sách khóa học quản trị:', err);
        setError('Không thể tải danh sách khóa học. Vui lòng thử lại sau.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      controller.abort();
    };
  }, [
    statusFilter,
    categoryFilter,
    searchQuery,
    currentPage,
    refreshVersion,
  ]);

  const handleApprove = useCallback(
    async (course: InstructorCourse) => {
      setProcessingId(course.id);
      try {
        await adminService.approveCourse(course.id);
        showToast('Đã duyệt khóa học', 'success');
        setDetailCourse(null);

        scheduleRefresh();
      } catch (err) {
        console.error('Duyệt khóa học thất bại:', err);
        showToast(getApiErrorMessage(err, 'Không thể duyệt khóa học. Vui lòng thử lại.'), 'error');
      } finally {
        setProcessingId(null);
      }
    },
    [scheduleRefresh, showToast]
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
      scheduleRefresh();
    } catch (err) {
      console.error('Từ chối khóa học thất bại:', err);

      setRejectError(getApiErrorMessage(err, 'Không thể từ chối khóa học. Vui lòng thử lại.'));
    } finally {
      setProcessingId(null);
    }
  }, [rejectingCourse, rejectComment, scheduleRefresh, showToast]);

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
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm khóa học"
            />
            <i className="bi bi-search"></i>
          </div>
        </div>

        {error && pageData && <div className="alert alert-danger">{error}</div>}
        <div
          className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
          aria-busy={loading}
        >
          {loading && !pageData ? (
            <LoadingScreen variant="table" count={6} />
          ) : error && !pageData ? (
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
                onPageChange={setPage}
              />
            )}
            </>
          )}
        </div>
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
