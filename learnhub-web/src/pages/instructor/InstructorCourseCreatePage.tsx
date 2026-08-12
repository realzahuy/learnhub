import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, DropdownOption, Stepper } from '../../components/common';
import CourseInfoForm from '../../components/features/instructor/CourseInfoForm';
import CourseReviewStep from '../../components/features/instructor/CourseReviewStep';
import CourseLessonsEditor from '../../components/features/instructor/CourseLessonsEditor';
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
  toCourseForm,
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
    lessonKinds,
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
  } = useCourseBuilder(courseId);

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

  const { categories } = useCategories(true);

  useEffect(() => {
    if (!isReopening || !isValidId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const detail = await instructorService.getCourseDetail(reopenId as number);
        if (cancelled) return;

        if (!BUILDABLE.includes(detail.status)) {
          setStatus(detail.status);
          setLoading(false);
          return;
        }

        setStatus(detail.status);
        setForm(toCourseForm(detail));
        setThumbnailUrl(detail.thumbnail);

        const [content, rejectReason] = await Promise.all([
          instructorService.getCourseContent(reopenId as number),
          detail.status === 'REJECTED'
            ? instructorService.getRejectReason(reopenId as number).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setRejectComment(rejectReason?.comment ?? null);

        hydrateCourseContent(content);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải khóa học để biên soạn:', err);
        setLoadError('Không tải được khóa học. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
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
        const created = await instructorService.createDraftCourse({
          title: form.title.trim(),
          slug: form.slug.trim() || undefined,
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          categoryId: Number(form.categoryId),
        });
        id = created.id;
        newlyCreatedId = id;
        setCourseId(id);
      }

      const needsUpdate = courseId !== null || thumbnailFile !== null;
      if (needsUpdate) {
        const updated = await instructorService.updateCourse(
          id,
          {
            title: form.title.trim(),

            slug: form.slug.trim(),
            shortDescription: form.shortDescription.trim(),
            description: form.description.trim(),
            price: Number(form.price),
            categoryId: Number(form.categoryId),
            thumbnail: thumbnailUrl,
            thumbnailFile,
          },
          false
        );

        setThumbnailUrl(updated.thumbnail);
        clearThumbnailFile();
      }

      setStep(STEP_LESSONS);
      setSlugSuggestions([]);
      setConflictingSlug(null);
      if (newlyCreatedId !== null) {
        navigate(routeTo.instructorCourseBuild(newlyCreatedId), { replace: true });
      }
    } catch (err) {
      console.error('Không thể lưu thông tin khóa học:', err);
      const suggestions = getApiSuggestions(err) ?? [];
      if (suggestions.length > 0) {
        setSlugSuggestions(suggestions);
        setConflictingSlug(form.slug.trim() || generateSlug(form.title));

        setForm((prev) => ({ ...prev, slug: '' }));
      }
      setError(getApiErrorMessage(err, 'Không lưu được thông tin khóa học. Vui lòng thử lại.'));

      if (newlyCreatedId !== null) {
        navigate(routeTo.instructorCourseBuild(newlyCreatedId), { replace: true });
      }
    } finally {
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
      console.error('Không thể xóa khóa học:', err);
      showToast(getApiErrorMessage(err, 'Không xóa được khóa học.'), 'error');
    } finally {
      setDeletingCourse(false);
    }
  }, [courseId, deletingCourse, form.title, navigate, showToast]);

  const finishAsDraft = useCallback(() => {
    showToast('Đã lưu khóa học ở dạng nháp', 'success');
    navigate(ROUTE_PATHS.instructorCourses, { replace: true });
  }, [navigate, showToast]);

  const submitForReview = useCallback(async () => {
    if (courseId === null) return;

    setSaving(true);
    setError(null);
    try {
      await instructorService.updateCourse(
        courseId,
        {
          title: form.title.trim(),
          slug: form.slug.trim(),
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          categoryId: Number(form.categoryId),
          thumbnail: thumbnailUrl,
          thumbnailFile: null,
        },
        true
      );
      showToast('Đã gửi khóa học cho admin duyệt', 'success');
      navigate(ROUTE_PATHS.instructorCourses, { replace: true });
    } catch (err) {
      console.error('Không thể gửi khóa học để duyệt:', err);
      setError(getApiErrorMessage(err, 'Không gửi duyệt được. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }, [courseId, form, thumbnailUrl, navigate, showToast]);

  if (!isValidId) {
    return <Navigate to={ROUTE_PATHS.instructorCourses} replace />;
  }

  if (status !== null && !BUILDABLE.includes(status)) {
    return <Navigate to={routeTo.instructorCourseEdit(reopenId as number)} replace />;
  }

  if (loading) {
    return (
      <div className="course-create-page">
        <main className="course-create-main">
          <div className="container py-5 text-center">
            <div className="spinner-border text-notion" role="status">
              <span className="visually-hidden">Đang tải...</span>
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
          {
}
          <Stepper steps={STEPS} current={step} onStepClick={saving ? undefined : setStep} />

          { }
          {rejectComment && (
            <div className="alert alert-danger">
              <strong>Lý do bị từ chối:</strong> {rejectComment}
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {

}
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

          { }
          {step === STEP_LESSONS && courseId !== null && (
            <div className="course-create-card">
              {
}
              <CourseLessonsEditor
                courseId={courseId}
                lessons={lessons}
                kinds={lessonKinds}
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

          { }
          {step === STEP_REVIEW && (
            <CourseReviewStep
              form={form}
              categoryName={categories.find((category) => String(category.id) === form.categoryId)?.name}
              currentThumbnail={currentThumbnail}
              lessons={lessons}
              lessonKinds={lessonKinds}
              videos={videos}
              questions={questions}
            />
          )}

          { }
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
                {
}
                <button
                  type="button"
                  className="btn-course-create-outline"
                  onClick={finishAsDraft}
                  disabled={saving}
                >
                  Lưu nháp
                </button>
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
                  onClick={finishAsDraft}
                  disabled={saving}
                >
                  Lưu nháp
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
