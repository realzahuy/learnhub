import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, DropdownOption, LoadingScreen, Stepper } from '../../components/common';
import { useInstructorCourseDraft } from '../../components/features/instructor/useInstructorCourseDraft';
import { useCategories } from '../../hooks/useCategories';
import { generateSlug } from '../../utils';
import { ROUTE_PATHS, routeTo } from '../../routes/paths';
import './InstructorCourseCreatePage.css';

const CourseInfoForm = lazy(() => import('../../components/features/instructor/CourseInfoForm'));
const CourseReviewStep = lazy(() => import('../../components/features/instructor/CourseReviewStep'));
const CourseLessonsEditor = lazy(() => import('../../components/features/instructor/CourseLessonsEditor'));
const InstructorCourseContentViewer = lazy(() => import('../../components/features/instructor/InstructorCourseContentViewer'));

const STEPS = ['Tạo khóa học', 'Tạo bài giảng', 'Xem lại'];

const COURSE_INFO_FORM_ID = 'course-info-form';

const STEP_INFO = 0;
const STEP_LESSONS = 1;
const STEP_REVIEW = 2;

const InstructorCourseCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const reopenId = id ? Number(id) : null;
  const isReopening = reopenId !== null;
  const isValidId = !isReopening || (Number.isInteger(reopenId) && (reopenId as number) > 0);

  const [step, setStep] = useState(isReopening ? STEP_LESSONS : STEP_INFO);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const onInfoSaved = useCallback(() => setStep(STEP_LESSONS), []);
  const onCourseCreated = useCallback((id: number) => {
    navigate(routeTo.instructorCourseBuild(id), { replace: true });
  }, [navigate]);
  const onFinished = useCallback(() => {
    navigate(ROUTE_PATHS.instructorCourses, { replace: true });
  }, [navigate]);
  const {
    courseId, loading, loadError, rejectComment, form, currentThumbnail,
    fileInputRef, handlePickThumbnail, saving, error, slugSuggestions, conflictingSlug,
    deletingCourse, contentBusy, setContentBusy, handleChange, saveInfo: saveInfoAndContinue,
    deleteCourse, submitForReview, content, isReadOnlyContent,
  } = useInstructorCourseDraft({ reopenId, isValidId, onInfoSaved, onCourseCreated, onFinished });
  const {
    lessons, videos, questions, processingProgressByVideoId, setLessons,
    addLesson: handleLessonAdd, updateLesson: handleLessonUpdate, removeLesson: handleLessonRemove,
    changeVideos: handleVideosChange, changeQuestions: handleQuestionsChange,
  } = content;

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

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

  const exitBuilder = useCallback(() => {
    if (contentBusy) return;
    navigate(ROUTE_PATHS.instructorCourses, { replace: true });
  }, [contentBusy, navigate]);

  if (!isValidId) {
    return <Navigate to={ROUTE_PATHS.instructorCourses} replace />;
  }

  if (loading || categoriesLoading) {
    return <LoadingScreen variant="form" count={5} />;
  }

  if (isReadOnlyContent && courseId !== null) {
    return (
      <div className="course-create-page">
        <main className="course-create-main">
          <div className="container py-4">
            <div className="course-create-heading">
              <h1 className="course-create-title">Nội dung khóa học</h1>
            </div>

            {loadError || categoriesError ? (
              <div className="alert alert-danger">{loadError ?? categoriesError}</div>
            ) : (
              <>
                <div className="alert alert-info">
                  Khóa học đang ở trạng thái không cho phép sửa nội dung. Bạn vẫn có thể xem lại
                  các bài giảng đã tạo bên dưới.
                </div>
                <Suspense fallback={<LoadingScreen variant="form" count={5} />}>
                  <InstructorCourseContentViewer
                    lessons={lessons}
                    videos={videos}
                    questions={questions}
                  />
                </Suspense>
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
                disabled={saving || deletingCourse || contentBusy}
              >
                Xóa khóa học
              </button>
            )}
          </div>

          {loadError || categoriesError ? (
            <div className="alert alert-danger">{loadError ?? categoriesError}</div>
          ) : (
            <>
          <Stepper
            steps={STEPS}
            current={step}
            onStepClick={saving || contentBusy ? undefined : setStep}
          />

          {rejectComment && (
            <div className="alert alert-danger">
              <strong>Lý do bị từ chối:</strong> {rejectComment}
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {step === STEP_INFO && (
            <Suspense fallback={<LoadingScreen variant="form" count={5} />}>
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
            </Suspense>
          )}

          {step === STEP_LESSONS && courseId !== null && (
            <div className="course-create-card">
              <Suspense fallback={<LoadingScreen variant="form" count={5} />}>
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
                  onBusyChange={setContentBusy}
                />
              </Suspense>
            </div>
          )}

          {step === STEP_REVIEW && (
            <Suspense fallback={<LoadingScreen variant="form" count={5} />}>
              <CourseReviewStep
                form={form}
                categoryName={categories.find((category) => String(category.id) === form.categoryId)?.name}
                currentThumbnail={currentThumbnail}
                lessons={lessons}
                videos={videos}
                questions={questions}
              />
            </Suspense>
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
              disabled={saving || contentBusy}
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
                  disabled={saving || contentBusy}
                >
                  {contentBusy ? 'Đang lưu...' : 'Tiếp tục'}
                </button>
              </div>
            )}

            {step === STEP_REVIEW && (
              <div className="course-create-nav-finish">
                <button
                  type="button"
                  className="btn-course-create-outline"
                  onClick={exitBuilder}
                  disabled={saving || contentBusy}
                >
                  Thoát
                </button>
                <button
                  type="button"
                  className="btn-course-create-primary"
                  onClick={submitForReview}
                  disabled={saving || contentBusy}
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
        pending={deletingCourse}
        onConfirm={deleteCourse}
        onCancel={() => {
          if (!deletingCourse) setDeleteDialogOpen(false);
        }}
      />

    </div>
  );
};

export default InstructorCourseCreatePage;
