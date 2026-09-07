import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useCourseThumbnail } from '../../../hooks/useCourseThumbnail';
import { useCourseBuilder } from '../../../hooks/useCourseBuilder';
import { instructorService } from '../../../services/api/instructor.service';
import { queryClient } from '../../../query/queryClient';
import { queryKeys } from '../../../query/queryKeys';
import { CourseStatus } from '../../../types/course.types';
import { generateSlug, getApiErrorMessage, getApiSuggestions } from '../../../utils';
import {
  CourseFormState, EMPTY_COURSE_FORM, toCourseCreatePayload, toCourseForm,
  toCourseUpdatePayload, validateCourseForm,
} from '../../../utils/courseForm';

const BUILDABLE: CourseStatus[] = ['DRAFT', 'REJECTED'];

interface CourseDraftOptions {
  reopenId: number | null;
  isValidId: boolean;
  onInfoSaved: () => void;
  onCourseCreated: (courseId: number) => void;
  onFinished: () => void;
}

export const useInstructorCourseDraft = ({
  reopenId, isValidId, onInfoSaved, onCourseCreated, onFinished,
}: CourseDraftOptions) => {
  const { showToast } = useToast();
  const isReopening = reopenId !== null;

  const [courseId, setCourseId] = useState<number | null>(reopenId);

  const [loading, setLoading] = useState(isReopening);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState<CourseStatus | null>(null);
  const [rejectComment, setRejectComment] = useState<string | null>(null);

  const [form, setForm] = useState<CourseFormState>(EMPTY_COURSE_FORM);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const content = useCourseBuilder(courseId, status === null || BUILDABLE.includes(status));
  const { hydrate: hydrateCourseContent } = content;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [conflictingSlug, setConflictingSlug] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);

  const {
    thumbnailFile,
    thumbnailPreview,
    fileInputRef,
    handlePickThumbnail,
    clearThumbnailFile,
  } = useCourseThumbnail(setError);

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

  const handleChange = useCallback((field: keyof CourseFormState, value: string) => {
    setError(null);
    if (field === 'title' || field === 'slug') {
      setSlugSuggestions([]);
      setConflictingSlug(null);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveInfo = useCallback(async () => {
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

      void queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.all });
      onInfoSaved();
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
        onCourseCreated(newlyCreatedId);
      }
      setSaving(false);
    }
  }, [courseId, form, slugSuggestions, thumbnailFile, thumbnailUrl, clearThumbnailFile, onInfoSaved, onCourseCreated]);

  const deleteCourse = useCallback(async () => {
    if (courseId === null || deletingCourse || contentBusy) return;

    setDeletingCourse(true);
    try {
      await instructorService.deleteCourse(courseId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.all });
      showToast(`Đã xóa khóa học "${form.title}"`, 'success');
      onFinished();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không xóa được khóa học.'), 'error');
    } finally {
      setDeletingCourse(false);
    }
  }, [contentBusy, courseId, deletingCourse, form.title, onFinished, showToast]);

  const submitForReview = useCallback(async () => {
    if (courseId === null || contentBusy) return;

    setSaving(true);
    setError(null);
    try {
      await instructorService.submitCourse(courseId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.instructorCourses.all });
      showToast('Đã gửi khóa học cho admin duyệt', 'success');
      onFinished();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không gửi duyệt được. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }, [contentBusy, courseId, onFinished, showToast]);

  return {
    courseId, loading, loadError, rejectComment, form,
    currentThumbnail: thumbnailPreview ?? thumbnailUrl,
    fileInputRef, handlePickThumbnail, saving, error, slugSuggestions, conflictingSlug,
    deletingCourse, contentBusy, setContentBusy, handleChange, saveInfo, deleteCourse,
    submitForReview, content, isReadOnlyContent: status !== null && !BUILDABLE.includes(status),
  };
};
