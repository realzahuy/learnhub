import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, DropdownOption, LoadingScreen, Stepper } from '../../components/common';
import CourseInfoForm from '../../components/features/instructor/CourseInfoForm';
import CourseReviewStep from '../../components/features/instructor/CourseReviewStep';
import CourseLessonsEditor from '../../components/features/instructor/CourseLessonsEditor';
import InstructorCourseContentViewer from '../../components/features/instructor/InstructorCourseContentViewer';
import { useToast } from '../../context/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { useCourseThumbnail } from '../../hooks/useCourseThumbnail';
import { useCourseBuilder } from '../../hooks/useCourseBuilder';
import { instructorService } from '../../services/api/instructor.service';
import { CourseStatus } from '../../types/course.types';
import {
  generateSlug,
  getApiErrorMessage,
  getApiSuggestions,
} from '../../utils';
import {
  CourseFormState,
  EMPTY_COURSE_FORM,
  toCourseCreatePayload,
  toCourseForm,
  toCourseUpdatePayload,
  validateCourseForm,
} from '../../utils/courseForm';
import './InstructorCourseCreatePage.css';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';

const STEPS = ['Tạo khóa học', 'Tạo bài giảng', 'Xem lại'];

const COURSE_INFO_FORM_ID = 'course-info-form';

const STEP_INFO = 0;
const STEP_LESSONS = 1;
const STEP_REVIEW = 2;

const BUILDABLE: CourseStatus[] = ['DRAFT', 'REJECTED'];

const InstructorCourseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { id } = useParams<{ id: string }>();
  const reopenId = id ? Number(id) : null;
  const isReopening = reopenId !== null;
  const isValidId = !isReopening || (Number.isInteger(reopenId) && (reopenId as number) > 0);

  const [step, setStep] = useState(isReopening ? STEP_LESSONS : STEP_INFO);

  const [courseId, setCourseId] = useState<number | null>(reopenId);

  const [loading, setLoading] = useState(isReopening);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState<CourseStatus | null>(null);
  const [rejectComment, setRejectComment] = useState<string | null>(null);

  const [form, setForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const {
    lessons,
    videos,
    questions,
    processingProgressByVideoId,
    setLessons,
    hydrate: hydrateCourseContent,
    addLesson: handleLessonAdd,
    updateLesson: handleLessonUpdate,
    removeLesson: handleLessonRemove,
    changeVideos: handleVideosChange,
    changeQuestions: handleQuestionsChange,
  } = useCourseBuilder(
    courseId,
    status === null || BUILDABLE.includes(status)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [conflictingSlug, setConflictingSlug] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  const {
    thumbnailFile,
    thumbnailPreview,
    fileInputRef,
    handlePickThumbnail,
    clearThumbnailFile,
  } = useCourseThumbnail(setError);

  const { categories } = useCategories();

  useEffect(() => {
    if (!isReopening || !isValidId) return;

    const controller = new AbortController();
    setCourseId(reopenId);

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const detail = await instructorService.getCourseDetail(
          reopenId as number,
          controller.signal
        );
        if (controller.signal.aborted) return;

        setStatus(detail.status);
        setForm(toCourseForm(detail));
        setThumbnailUrl(detail.thumbnail);

        const [content, rejectReason] = await Promise.all([
          instructorService.getCourseContent(reopenId as number, controller.signal),
          detail.status === 'REJECTED'
            ? instructorService
                .getRejectReason(reopenId as number, controller.signal)
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;
        setRejectComment(rejectReason?.comment ?? null);

        hydrateCourseContent(content);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLoadError('Không tải được khóa học. Vui lòng thử lại sau.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [isReopening, isValidId, reopenId, hydrateCourseContent]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const categoryOptions = useMemo<DropdownOption[]>(
    () => categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
    [categories]
  );

  const slugPreview = generateSlug(form.title);

  const currentThumbnail = thumbnailPreview ?? thumbnailUrl;

  const handleChange = useCallback((field: keyof CourseFormState, value: string) => {
    setError(null);
    if (field === 'title' || field === 'slug') {
      setSlugSuggestions([]);
      setConflictingSlug(null);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveInfoAndContinue = useCallback(async () => {
    const validationError = validateCourseForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (slugSuggestions.length > 0 && !form.slug.trim()) {
      setError('Slug đã tồn tại. Vui lòng nhập slug khác hoặc chọn một gợi ý bên dưới.');
      return;
    }

    setSaving(true);
    setError(null);

    let newlyCreatedId: number | null = null;

    try {
      let id = courseId;

      if (id === null) {
        const created = await instructorService.createDraftCourse(
          toCourseCreatePayload(form, thumbnailFile)
        );
        id = created.id;
        newlyCreatedId = id;
        setCourseId(id);
        setThumbnailUrl(created.thumbnail);
        clearThumbnailFile();
      } else {
        const updated = await instructorService.updateCourse(
          id,
          toCourseUpdatePayload(form, {
            thumbnail: thumbnailUrl,
            thumbnailFile,
          })
        );

        setThumbnailUrl(updated.thumbnail);
        clearThumbnailFile();
      }

      setStep(STEP_LESSONS);
      setSlugSuggestions([]);
      setConflictingSlug(null);
    } catch (err) {
      const suggestions = getApiSuggestions(err) ?? [];
      if (suggestions.length > 0) {
        setSlugSuggestions(suggestions);
        setConflictingSlug(form.slug.trim() || generateSlug(form.title));

        setForm((prev) => ({ ...prev, slug: '' }));
      }
      setError(getApiErrorMessage(err, 'Không lưu được thông tin khóa học. Vui lòng thử lại.'));
    } finally {
      if (newlyCreatedId !== null) {
        navigate(routeTo.instructorCourseBuild(newlyCreatedId), { replace: true });
      }
      setSaving(false);
    }
  }, [courseId, form, slugSuggestions, thumbnailFile, thumbnailUrl, clearThumbnailFile, navigate]);

  const deleteCourse = useCallback(async () => {
    if (courseId === null || deletingCourse) return;

    setDeletingCourse(true);
    try {
      await instructorService.deleteCourse(courseId);
      showToast(`Đã xóa khóa học "${form.title}"`, 'success');
      navigate(ROUTE_PATHS.instructorCourses, { replace: true });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không xóa được khóa học.'), 'error');
    } finally {
      setDeletingCourse(false);
    }
  }, [courseId, deletingCourse, form.title, navigate, showToast]);

  const exitBuilder = useCallback(() => {
    navigate(ROUTE_PATHS.instructorCourses, { replace: true });
  }, [navigate]);

  const submitForReview = useCallback(async () => {
    if (courseId === null) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await instructorService.updateCourse(
        courseId,
        toCourseUpdatePayload(form, {
          thumbnail: thumbnailUrl,
          thumbnailFile,
        })
      );
      setThumbnailUrl(updated.thumbnail);
      clearThumbnailFile();
      await instructorService.submitCourse(courseId);
      showToast('Đã gửi khóa học cho admin duyệt', 'success');
      navigate(ROUTE_PATHS.instructorCourses, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không gửi duyệt được. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }, [courseId, form, thumbnailFile, thumbnailUrl, clearThumbnailFile, navigate, showToast]);

  if (!isValidId) {
    return <Navigate to={ROUTE_PATHS.instructorCourses} replace />;
  }

  if (loading) {
    return <LoadingScreen variant="form" count={5} />;
  }

  const isReadOnlyContent = status !== null && !BUILDABLE.includes(status);

  if (isReadOnlyContent && courseId !== null) {
    return (
      <div className="course-create-page">
        <main className="course-create-main">
          <div className="container py-4">
            <div className="course-create-heading">
              <h1 className="course-create-title">Nội dung khóa học</h1>
            </div>

            {loadError ? (
              <div className="alert alert-danger">{loadError}</div>
            ) : (
              <>
                <div className="alert alert-info">
                  Khóa học đang ở trạng thái không cho phép sửa nội dung. Bạn vẫn có thể xem lại
                  các bài giảng đã tạo bên dưới.
                </div>
                <InstructorCourseContentViewer
                  lessons={lessons}
                  videos={videos}
                  questions={questions}
                />
              </>
            )}

            <div className="course-create-nav">
              <button
                type="button"
                className="btn-course-create-outline"
                onClick={() => navigate(routeTo.instructorCourseEdit(courseId))}
              >
                Quay lại
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="course-create-page">

      <main className="course-create-main">
        <div className="container py-4">
          <div className="course-create-heading">
            <h1 className="course-create-title">
              {isReopening ? 'Soạn tiếp khóa học' : 'Tạo khóa học mới'}
            </h1>

            {courseId !== null && (
              <button
                type="button"
                className="btn-course-create-danger"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={saving || deletingCourse}
              >
                Xóa khóa học
              </button>
            )}
          </div>

          {loadError ? (
            <div className="alert alert-danger">{loadError}</div>
          ) : (
            <>
          <Stepper steps={STEPS} current={step} onStepClick={saving ? undefined : setStep} />

          {rejectComment && (
            <div className="alert alert-danger">
              <strong>Lý do bị từ chối:</strong> {rejectComment}
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {step === STEP_INFO && (
            <CourseInfoForm
              id={COURSE_INFO_FORM_ID}
              variant="create"
              form={form}
              categoryOptions={categoryOptions}
              currentThumbnail={currentThumbnail}
              fileInputRef={fileInputRef}
              onThumbnailChange={handlePickThumbnail}
              onChange={handleChange}
              onSubmit={saveInfoAndContinue}
              disabled={saving}
              slugPlaceholder={conflictingSlug ?? slugPreview}
              slugHint={
                slugSuggestions.length > 0 ? (
                  <div className="course-slug-alternatives">
                    <small>Gợi ý:</small>
                    {slugSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleChange('slug', suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : (
                  <small className="text-muted">
                    {slugPreview
                      ? 'Để trống sẽ dùng đường dẫn gợi ý ở trên.'
                      : 'Để trống sẽ tự sinh từ tiêu đề.'}
                  </small>
                )
              }
            />
          )}

          {step === STEP_LESSONS && courseId !== null && (
            <div className="course-create-card">
              <CourseLessonsEditor
                courseId={courseId}
                lessons={lessons}
                videos={videos}
                processingProgressByVideoId={processingProgressByVideoId}
                questions={questions}
                onLessonAdd={handleLessonAdd}
                onLessonUpdate={handleLessonUpdate}
                onLessonsReorder={setLessons}
                onLessonRemove={handleLessonRemove}
                onVideosChange={handleVideosChange}
                onQuestionsChange={handleQuestionsChange}
              />
            </div>
          )}

          {step === STEP_REVIEW && (
            <CourseReviewStep
              form={form}
              categoryName={categories.find((category) => String(category.id) === form.categoryId)?.name}
              currentThumbnail={currentThumbnail}
              lessons={lessons}
              videos={videos}
              questions={questions}
            />
          )}

          <div className="course-create-nav">
            <button
              type="button"
              className="btn-course-create-outline"
              onClick={() => (
                step === STEP_INFO
                  ? navigate(ROUTE_PATHS.instructorCourses)
                  : setStep(step - 1)
              )}
              disabled={saving}
            >
              {step === STEP_INFO ? 'Hủy' : 'Quay lại'}
            </button>

            {step === STEP_INFO && (

              <button
                type="submit"
                form={COURSE_INFO_FORM_ID}
                className="btn-course-create-primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Tiếp tục'}
              </button>
            )}

            {step === STEP_LESSONS && (
              <div className="course-create-nav-finish">
                <button
                  type="button"
                  className="btn-course-create-primary"
                  onClick={() => setStep(STEP_REVIEW)}
                  disabled={saving}
                >
                  Tiếp tục
                </button>
              </div>
            )}

            {step === STEP_REVIEW && (
              <div className="course-create-nav-finish">
                <button
                  type="button"
                  className="btn-course-create-outline"
                  onClick={exitBuilder}
                  disabled={saving}
                >
                  Thoát
                </button>
                <button
                  type="button"
                  className="btn-course-create-primary"
                  onClick={submitForReview}
                  disabled={saving}
                >
                  {saving ? 'Đang gửi...' : 'Gửi duyệt'}
                </button>
              </div>
            )}
              </div>
            </>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={`Xóa khóa học "${form.title}"?`}
        message="Toàn bộ bài giảng, video và câu hỏi sẽ bị xóa vĩnh viễn. Không thể hoàn tác."
        confirmLabel={deletingCourse ? 'Đang xóa...' : 'Xóa khóa học'}
        cancelLabel="Giữ lại"
        variant="danger"
        onConfirm={deleteCourse}
        onCancel={() => {
          if (!deletingCourse) setDeleteDialogOpen(false);
        }}
      />

    </div>
  );
};

export default InstructorCourseCreatePage;
