import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import AdminCourseDialogs from './AdminCourseDialogs';
import AdminCourseTable from './AdminCourseTable';
import { Dropdown, DropdownOption, Pagination, LoadingScreen } from '../../components/common';
import { useCourseRealtime } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { useCoalescedRefreshTrigger } from '../../hooks/useCoalescedRefreshTrigger';
import { useCategories } from '../../hooks/useCategories';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { adminService } from '../../services/api/admin.service';
import { queryKeys } from '../../query/queryKeys';
import { queryClient } from '../../query/queryClient';
import {
  InstructorCourse,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
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

  const { categories } = useCategories();

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
  const seenRefreshVersion = useRef(refreshVersion);
  filtersRef.current = { status: statusFilter, category: categoryFilter, search: searchQuery };

  const courseFilters = {
    page: currentPage,
    status: statusFilter,
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  };
  const courseQuery = useQuery({
    queryKey: queryKeys.adminCourses.list(courseFilters),
    queryFn: ({ signal }) => adminService.listCourses(courseFilters, signal),
    placeholderData: keepPreviousData,
  });
  const pageData = courseQuery.data ?? null;
  const loading = courseQuery.isFetching;
  const error = courseQuery.error
    ? 'Không thể tải danh sách khóa học. Vui lòng thử lại sau.'
    : null;

  useEffect(() => {
    if (!lastCourseStatusEvent) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.adminCourses.all,
      refetchType: 'none',
    });
    if (shouldRefreshAdminCourseList(lastCourseStatusEvent, filtersRef.current)) {
      scheduleRefresh();
    }
  }, [lastCourseStatusEvent, scheduleRefresh]);

  useEffect(() => {
    if (realtimeReconnectVersion === seenReconnectVersion.current) return;
    seenReconnectVersion.current = realtimeReconnectVersion;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.adminCourses.all,
      refetchType: 'none',
    });
    scheduleRefresh();
  }, [realtimeReconnectVersion, scheduleRefresh]);

  useEffect(() => {
    if (seenRefreshVersion.current === refreshVersion) return;
    seenRefreshVersion.current = refreshVersion;
    void courseQuery.refetch();
  }, [courseQuery.refetch, refreshVersion]);

  const handleApprove = useCallback(
    async (course: InstructorCourse) => {
      setProcessingId(course.id);
      try {
        await adminService.approveCourse(course.id);
        showToast('Đã duyệt khóa học', 'success');
        setDetailCourse(null);
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.adminCourses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all }),
        ]);
      } catch (err) {
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
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminCourses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all }),
      ]);
    } catch (err) {
      setRejectError(getApiErrorMessage(err, 'Không thể từ chối khóa học. Vui lòng thử lại.'));
    } finally {
      setProcessingId(null);
    }
  }, [rejectingCourse, rejectComment, showToast]);

  const courses = pageData?.content ?? [];

  return (
    <>
      <div className="admin-courses">
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
        <div className="list-loading-status" role="status">
          {loading && pageData ? 'Đang cập nhật…' : ''}
        </div>
        <div
          className="motion-loading-region"
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

      {(detailCourse || rejectingCourse) && (
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
      )}
    </>
  );
};

export default AdminCoursesPage;
