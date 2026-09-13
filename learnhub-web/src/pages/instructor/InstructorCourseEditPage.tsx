import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useContentReady } from '../../hooks/useContentReady';
import { useCourseThumbnail } from '../../hooks/useCourseThumbnail';
import CourseInfoForm from '../../components/features/instructor/CourseInfoForm';
import { DropdownOption, PageSkeleton } from '../../components/common';
import { instructorService } from '../../services/api/instructor.service';
import { queryClient } from '../../query/queryClient';
import { queryKeys } from '../../query/queryKeys';
import {
  CourseStatus,
  COURSE_STATUS_LABELS,
} from '../../types/course.types';
import { getApiErrorMessage } from '../../utils';
import {
  CourseFormState,
  EMPTY_COURSE_FORM,
  toCourseForm,
  toCourseUpdatePayload,
  validateCourseForm,
} from '../../utils/courseForm';
import './InstructorCourseEditPage.css';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';

const EDITABLE_ALL: CourseStatus[] = ['DRAFT', 'REJECTED'];

const InstructorCourseEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [formDraft, setFormDraft] = useState<CourseFormState | null>(null);
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
  const courseQuery = useQuery({
    queryKey: queryKeys.instructorCourses.detail(courseId),
    queryFn: ({ signal }) => instructorService.getCourseDetail(courseId, signal),
    enabled: isValidId,
  });
  const course = courseQuery.data;
  const form = formDraft ?? (course ? toCourseForm(course) : EMPTY_COURSE_FORM);
  const loading = courseQuery.isPending;
  const loadError = courseQuery.error && !course
    ? 'Không thể tải thông tin khóa học. Vui lòng thử lại sau.'
    : null;
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories(isValidId);
  const contentRef = useContentReady(loading || categoriesLoading);

  const backTo =
    (location.state as { from?: string } | null)?.from ?? ROUTE_PATHS.instructorCourses;

  const status = course?.status;
  const isReadOnly = status === 'PENDING';
  const categoryOptions = useMemo<DropdownOption[]>(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories]
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [courseId]);

  const handleChange = useCallback((field: keyof CourseFormState, value: string) => {
    setSaveError(null);
    setFormDraft((prev) => ({
      ...(prev ?? (course ? toCourseForm(course) : EMPTY_COURSE_FORM)),
      [field]: value,
    }));
  }, [course]);

  const save = async (destination = backTo) => {
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
      const updated = await instructorService.updateCourse(
        course.id,
        toCourseUpdatePayload(form, {
          slug: '',
          thumbnail: course.thumbnail,
          thumbnailFile,
        })
      );

      await queryClient.cancelQueries({ queryKey: queryKeys.instructorCourses.detail(course.id), exact: true });
      queryClient.setQueryData(queryKeys.instructorCourses.detail(course.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.lists() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
      navigate(destination, { replace: true });
    } catch (err) {
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
            <PageSkeleton variant="course-form" />
          ) : loadError || categoriesError ? (
            <div className="alert alert-danger">{loadError ?? categoriesError}</div>
          ) : (
            <div ref={contentRef}>
              {isReadOnly && (
                <div className="alert alert-warning">
                  Khóa học đang chờ admin duyệt nên không thể chỉnh sửa. Bạn có thể xem lại nội dung
                  đã gửi bên dưới.
                </div>
              )}

              {saveError && <div className="alert alert-danger">{saveError}</div>}

              <CourseInfoForm
                variant="edit"
                form={form}
                categoryOptions={categoryOptions}
                currentThumbnail={currentThumbnail}
                fileInputRef={fileInputRef}
                onThumbnailChange={handlePickThumbnail}
                onChange={handleChange}
                onSubmit={() => save()}
                disabled={isReadOnly || saving}
                identityDisabled
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
                      <button
                        type="submit"
                        className="btn-course-edit-primary"
                        disabled={saving}
                      >
                        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
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
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default InstructorCourseEditPage;
