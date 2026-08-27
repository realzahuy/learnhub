import React, { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '../../common';
import LessonRow from './LessonRow';
import { Lesson, Video } from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';
import { lessonService } from '../../../services/api/lesson.service';
import { useDragReorder } from '../../../hooks/useDragReorder';
import { useDeferredSave } from '../../../hooks/useDeferredSave';
import { getApiErrorMessage } from '../../../utils';
import './CourseLessonsEditor.css';

interface CourseLessonsEditorProps {
  courseId: number;
  lessons: Lesson[];

  videos: Record<number, Video[]>;
  processingProgressByVideoId: Record<number, number>;

  questions: Record<number, Question[]>;
  onLessonAdd: (lesson: Lesson) => void;
  onLessonUpdate: (lesson: Lesson) => void;

  onLessonsReorder: (lessons: Lesson[]) => void;
  onLessonRemove: (lessonId: number) => void;
  onVideosChange: (lessonId: number, updater: (prev: Video[]) => Video[]) => void;
  onQuestionsChange: (lessonId: number, questions: Question[]) => void;
}

interface NewLessonFormProps {
  courseId: number;
  onLessonAdd: (lesson: Lesson) => void;
  onError: React.Dispatch<React.SetStateAction<string | null>>;
}

const EMPTY_VIDEOS: Video[] = [];
const EMPTY_QUESTIONS: Question[] = [];

const NewLessonForm = React.memo(({
  courseId,
  onLessonAdd,
  onError,
}: NewLessonFormProps) => {
  const [newTitle, setNewTitle] = useState('');
  const [newIsPreview, setNewIsPreview] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      onError('Vui lòng nhập tên bài giảng');
      return;
    }

    setAdding(true);
    onError(null);
    try {
      const created = await lessonService.create(courseId, [{ title, isPreview: newIsPreview }]);
      if (created.length > 0) onLessonAdd(created[0]);
      setNewTitle('');
      setNewIsPreview(false);
    } catch (err) {
      onError(getApiErrorMessage(err, 'Không thêm được bài giảng. Vui lòng thử lại.'));
    } finally {
      setAdding(false);
    }
  }, [courseId, newIsPreview, newTitle, onError, onLessonAdd]);

  return (
    <div className="lessons-add">
      <div className="lessons-add-field">
        <label className="lessons-add-label" htmlFor="lesson-new-title">
          Tên bài giảng
        </label>
        <input
          id="lesson-new-title"
          type="text"
          className="form-control"
          placeholder="Nhập tên bài giảng"
          value={newTitle}
          onChange={(event) => {
            onError(null);
            setNewTitle(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleAdd();
            }
          }}
          maxLength={255}
          disabled={adding}
        />
      </div>

      <div className="lessons-add-options">
        <div className="lessons-add-field">
          <span className="lessons-add-label">Cho học viên xem thử</span>
          <label className="lessons-add-preview">
            <input
              type="checkbox"
              checked={newIsPreview}
              onChange={(event) => setNewIsPreview(event.target.checked)}
              disabled={adding}
            />
            Cho xem thử video của bài này
          </label>
        </div>

        <button
          type="button"
          className="btn-lesson-add lessons-add-submit"
          onClick={() => void handleAdd()}
          disabled={adding || newTitle.trim() === ''}
          title={newTitle.trim() === '' ? 'Nhập tên bài giảng trước đã' : undefined}
        >
          <i className="bi bi-plus-lg"></i>
          {adding ? 'Đang thêm...' : 'Thêm bài giảng'}
        </button>
      </div>
    </div>
  );
});

const CourseLessonsEditor: React.FC<CourseLessonsEditorProps> = ({
  courseId,
  lessons,
  videos,
  processingProgressByVideoId,
  questions,
  onLessonAdd,
  onLessonUpdate,
  onLessonsReorder,
  onLessonRemove,
  onVideosChange,
  onQuestionsChange,
}) => {
  const [error, setError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleRename = useCallback(
    async (lesson: Lesson, title: string): Promise<boolean> => {
      setError(null);
      try {
        const updated = await lessonService.update(courseId, lesson.id, {
          title,
          isPreview: lesson.isPreview,
          position: lesson.position,
        });
        onLessonUpdate(updated);
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Không đổi được tên bài giảng. Vui lòng thử lại.'));
        return false;
      }
    },
    [courseId, onLessonUpdate]
  );

  const handleTogglePreview = useCallback(
    async (lesson: Lesson): Promise<boolean> => {
      setError(null);
      try {
        const updated = await lessonService.update(courseId, lesson.id, {
          title: lesson.title,
          isPreview: !lesson.isPreview,
          position: lesson.position,
        });
        onLessonUpdate(updated);
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Không đổi được chế độ xem thử. Vui lòng thử lại.'));
        return false;
      }
    },
    [courseId, onLessonUpdate]
  );

  const rollbackRef = useRef<Lesson[] | null>(null);

  const saveOrder = useCallback(
    async (order: Lesson[]) => {
      try {
        const saved = await lessonService.reorder(
          courseId,
          order.map((lesson) => ({ id: lesson.id, position: lesson.position }))
        );
        rollbackRef.current = null;
        onLessonsReorder(saved);
      } catch (err) {
        if (rollbackRef.current) onLessonsReorder(rollbackRef.current);
        rollbackRef.current = null;
        setError(getApiErrorMessage(err, 'Không đổi được thứ tự bài giảng. Vui lòng thử lại.'));
      }
    },
    [courseId, onLessonsReorder]
  );

  const scheduleSaveOrder = useDeferredSave(saveOrder);

  const applyOrder = useCallback(
    (next: Lesson[]) => {
      if (!rollbackRef.current) rollbackRef.current = lessons;

      const renumbered = next.map((lesson, index) => ({ ...lesson, position: index + 1 }));
      setError(null);
      onLessonsReorder(renumbered);
      scheduleSaveOrder(renumbered);
    },
    [lessons, onLessonsReorder, scheduleSaveOrder]
  );

  const drag = useDragReorder(lessons, applyOrder);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      await lessonService.remove(courseId, pendingDelete.id);
      onLessonRemove(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không xóa được bài giảng. Vui lòng thử lại.'));
    } finally {
      setDeleting(false);
    }
  }, [courseId, pendingDelete, deleting, onLessonRemove]);

  return (
    <div className="lessons-editor">
      <div className="lessons-editor-heading">
        <h2 className="lessons-editor-title">Bài giảng của khóa học</h2>
        <p className="lessons-editor-hint">
          Thêm từng bài giảng rồi soạn video và câu hỏi.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <NewLessonForm courseId={courseId} onLessonAdd={onLessonAdd} onError={setError} />

      {lessons.length === 0 ? (
        <p className="lessons-empty">
          Chưa có bài giảng nào. Nhập tên rồi thêm bài giảng đầu tiên.
        </p>
      ) : (
        <ol className="lessons-list">
          {lessons.map((lesson) => {
            const lessonVideos = videos[lesson.id] ?? EMPTY_VIDEOS;
            const lessonProgress = Object.fromEntries(
              lessonVideos.map((video) => [video.id, processingProgressByVideoId[video.id] ?? 0])
            );

            return (
              <LessonRow
                key={lesson.id}
                courseId={courseId}
                lesson={lesson}
                videos={lessonVideos}
                processingProgressByVideoId={lessonProgress}
                questions={questions[lesson.id] ?? EMPTY_QUESTIONS}
                disabled={deleting}
                isDragging={drag.isDragging(lesson.id)}
                isDropTarget={drag.isDropTarget(lesson.id)}
                getDragItemProps={drag.itemProps}
                getDragHandleProps={drag.handleProps}
                onRename={handleRename}
                onTogglePreview={handleTogglePreview}
                onVideosChange={onVideosChange}
                onQuestionsChange={onQuestionsChange}
                onDelete={setPendingDelete}
              />
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Xóa bài giảng "${pendingDelete?.title ?? ''}"?`}
        message="Toàn bộ video và câu hỏi của bài giảng này cũng bị xóa theo. Không thể hoàn tác."
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa bài giảng'}
        cancelLabel="Giữ lại"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </div>
  );
};

export default React.memo(CourseLessonsEditor);
