import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useCategories } from '../../hooks/useCategories';
import { useCoalescedRefreshTrigger } from '../../hooks/useCoalescedRefreshTrigger';
import { useCourseThumbnail } from '../../hooks/useCourseThumbnail';
import CourseInfoForm from '../../components/features/instructor/CourseInfoForm';
import { DropdownOption, PageSkeleton } from '../../components/common';
import { instructorService } from '../../services/api/instructor.service';
import {
  InstructorCourse,
  CourseStatus,
  CourseRejectReason,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { getApiErrorMessage } from '../../utils';
import {
  CourseFormState,
  EMPTY_COURSE_FORM,
  toCourseForm,
  validateCourseForm,
} from '../../utils/courseForm';
import './InstructorCourseEditPage.css';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';

const EDITABLE_ALL: CourseStatus[] = ['DRAFT', 'REJECTED'];

const InstructorCourseEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { lastCourseStatusEvent, realtimeReconnectVersion } = useNotifications();

  const [course, setCourse] = useState<InstructorCourse | null>(null);
  const [rejectReason, setRejectReason] = useState<CourseRejectReason | null>(null);

  const [form, setForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    thumbnailFile,
    thumbnailPreview,
    fileInputRef,
    handlePickThumbnail,
  } = useCourseThumbnail(setSaveError);

  const courseId = Number(id);
  const isValidId = Number.isInteger(courseId) && courseId > 0;
  const { refreshVersion, scheduleRefresh } = useCoalescedRefreshTrigger();
  const courseIdRef = useRef(courseId);
  const seenReconnectVersion = useRef(realtimeReconnectVersion);
  courseIdRef.current = courseId;

  useEffect(() => {
    if (lastCourseStatusEvent?.courseId === courseIdRef.current) {
      scheduleRefresh();
    }
  }, [lastCourseStatusEvent, scheduleRefresh]);

  useEffect(() => {
    if (realtimeReconnectVersion === seenReconnectVersion.current) return;
    seenReconnectVersion.current = realtimeReconnectVersion;
    scheduleRefresh();
  }, [realtimeReconnectVersion, scheduleRefresh]);
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories(isValidId);

  const backTo =
    (location.state as { from?: string } | null)?.from ?? ROUTE_PATHS.instructorCourses;

  const status = course?.status;
  const canEditAll = status ? EDITABLE_ALL.includes(status) : false;
  const isReadOnly = status === 'PENDING';
  const canSubmitForReview = canEditAll;
  const categoryOptions = useMemo<DropdownOption[]>(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories]
  );

  useEffect(() => {
    if (!isValidId) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const detail = await instructorService.getCourseDetail(courseId, controller.signal);
        if (controller.signal.aborted) return;

        setCourse(detail);
        setForm(toCourseForm(detail));

        if (detail.status === 'REJECTED') {
          try {
            const reason = await instructorService.getRejectReason(courseId, controller.signal);
            if (!controller.signal.aborted) setRejectReason(reason);
          } catch {

          }
        } else {
          setRejectReason(null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Không thể tải chi tiết khóa học:', err);
        setLoadError('Không thể tải thông tin khóa học. Vui lòng thử lại sau.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => {
      controller.abort();
    };
  }, [
    isValidId,
    courseId,
    refreshVersion,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [courseId]);

  const handleChange = useCallback((field: keyof CourseFormState, value: string) => {
    setSaveError(null);
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const save = async (submitForReview: boolean, destination = backTo) => {
    if (!course) return;

    const validationError = validateCourseForm(form);
    if (validationError) {
      setSaveError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await instructorService.updateCourse(
        course.id,
        {
          title: form.title.trim(),

          slug: canEditAll ? form.slug.trim() : '',
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          categoryId: Number(form.categoryId),

          thumbnail: course.thumbnail,
          thumbnailFile,
        },
        submitForReview
      );

      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Không thể cập nhật khóa học:', err);
      setSaveError(getApiErrorMessage(err, 'Không thể lưu khóa học. Vui lòng thử lại sau.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (!isValidId) {
    return <Navigate to={ROUTE_PATHS.instructorCourses} replace />;
  }

  if (status && EDITABLE_ALL.includes(status)) {
    return (
      <Navigate
        to={routeTo.instructorCourseBuild(courseId)}
        replace
        state={{ from: backTo }}
      />
    );
  }

  const currentThumbnail = thumbnailPreview ?? course?.thumbnail ?? null;

  return (
    <div className="course-edit-page">

      <main className="course-edit-main">
        <div className="container py-4">
          <div className="course-edit-heading">
            <h1 className="course-edit-title">Chỉnh sửa khóa học</h1>
            {status && (
              <span className={`course-edit-status course-edit-status-${status.toLowerCase()}`}>
                {COURSE_STATUS_LABELS[status]}
              </span>
            )}
          </div>

          {loading || categoriesLoading ? (
            <PageSkeleton variant="form" count={5} />
          ) : loadError || categoriesError ? (
            <div className="alert alert-danger">{loadError ?? categoriesError}</div>
          ) : (
            <>
              {isReadOnly && (
                <div className="alert alert-warning">
                  Khóa học đang chờ admin duyệt nên không thể chỉnh sửa. Bạn có thể xem lại nội dung
                  đã gửi bên dưới.
                </div>
              )}

              {rejectReason && (
                <div className="alert alert-danger">
                  <strong>Lý do bị từ chối:</strong> {rejectReason.comment}
                </div>
              )}

              {saveError && <div className="alert alert-danger">{saveError}</div>}

              {
}
              <CourseInfoForm
                variant="edit"
                form={form}
                categoryOptions={categoryOptions}
                currentThumbnail={currentThumbnail}
                fileInputRef={fileInputRef}
                onThumbnailChange={handlePickThumbnail}
                onChange={handleChange}
                onSubmit={() => save(false)}
                disabled={isReadOnly || saving}
                identityDisabled={!canEditAll}
                slugHint={
                  <small className="text-muted">
                    Để trống sẽ giữ nguyên đường dẫn hiện tại.
                  </small>
                }
                identityLockedHint={
                  <small className="course-edit-locked">
                    Không sửa được vì khóa học đã xuất bản.
                  </small>
                }
                thumbnailActionLabel="Chọn ảnh mới"
                thumbnailHint={
                  thumbnailFile ? (
                    <span className="course-edit-hint d-block mt-2">
                      Ảnh mới, bấm Lưu để áp dụng
                    </span>
                  ) : null
                }
                sideActions={
                  <div className="course-edit-actions">
                    {!isReadOnly && (
                      <>
                        <button
                          type="submit"
                          className="btn-course-edit-primary"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                              />
                              Đang lưu...
                            </>
                          ) : (
                            'Lưu thay đổi'
                          )}
                        </button>
                        {canSubmitForReview && (
                          <button
                            type="button"
                            className="btn-course-edit-outline"
                            onClick={() => save(true)}
                            disabled={saving}
                          >
                            Lưu và gửi duyệt
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-course-edit-outline"
                      onClick={() => navigate(backTo)}
                      disabled={saving}
                    >
                      {isReadOnly ? 'Quay lại' : 'Hủy'}
                    </button>
                  </div>
                }
              />

              <div className="course-edit-next-actions">
                <button
                  type="button"
                  className="btn-course-edit-primary"
                  onClick={() => navigate(routeTo.instructorCourseBuild(courseId))}
                  disabled={saving}
                >
                  Tiếp tục
                </button>
              </div>
            </>
          )}
        </div>
      </main>

    </div>
  );
};

export default InstructorCourseEditPage;
