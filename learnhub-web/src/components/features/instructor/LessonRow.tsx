import React, { useEffect, useRef, useState } from 'react';
import LessonVideoList from './LessonVideoList';
import LessonQuestionList from './LessonQuestionList';
import { Lesson, LessonKind, LESSON_KIND_LABELS, Video } from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';

interface LessonRowProps {
  courseId: number;
  lesson: Lesson;

  kind: LessonKind;
  videos: Video[];
  processingProgressByVideoId: Record<number, number>;
  questions: Question[];
  disabled: boolean;

  isDragging: boolean;

  isDropTarget: boolean;

  dragItemProps: React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };

  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>;

  onRename: (lesson: Lesson, title: string) => Promise<boolean>;

  onTogglePreview: (lesson: Lesson) => Promise<boolean>;
  onVideosChange: (lessonId: number, updater: (prev: Video[]) => Video[]) => void;
  onQuestionsChange: (lessonId: number, questions: Question[]) => void;
  onDelete: (lesson: Lesson) => void;
}

const LessonRow: React.FC<LessonRowProps> = ({
  courseId,
  lesson,
  kind,
  videos,
  processingProgressByVideoId,
  questions,
  disabled,
  isDragging,
  isDropTarget,
  dragItemProps,
  dragHandleProps,
  onRename,
  onTogglePreview,
  onVideosChange,
  onQuestionsChange,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(true);

  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(lesson.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const cancelRef = useRef(false);

  useEffect(() => {
    if (editing) titleInputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setTitleDraft(lesson.title);
  }, [lesson.title]);

  const finishEditing = async () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setTitleDraft(lesson.title);
      setEditing(false);
      return;
    }

    const next = titleDraft.trim();
    if (!next || next === lesson.title) {
      setTitleDraft(lesson.title);
      setEditing(false);
      return;
    }

    setSavingTitle(true);
    const ok = await onRename(lesson, next);
    setSavingTitle(false);
    if (ok) setEditing(false);
    else titleInputRef.current?.focus();
  };

  const [savingPreview, setSavingPreview] = useState(false);

  const togglePreview = async () => {
    setSavingPreview(true);
    await onTogglePreview(lesson);
    setSavingPreview(false);
  };

  const contentCount = kind === 'QUIZ' ? questions.length : videos.length;
  const contentLabel =
    contentCount === 0
      ? kind === 'QUIZ'
        ? 'chưa có câu hỏi'
        : 'chưa có video'
      : `${contentCount} ${kind === 'QUIZ' ? 'câu hỏi' : 'video'}`;

  return (
    <li
      className={`lesson-row${isDragging ? ' is-dragging' : ''}${
        isDropTarget ? ' is-drop-target' : ''
      }`}
      {...dragItemProps}
      draggable={dragItemProps.draggable && !disabled}
    >
      {

}
      <div
        className="lesson-row-head"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          setExpanded((prev) => !prev);
        }}
      >
        <button
          type="button"
          className="lesson-row-handle"
          {...dragHandleProps}
          disabled={disabled}
          aria-label={`Đổi vị trí bài giảng ${lesson.title}`}
          title="Kéo để đổi vị trí, hoặc dùng phím mũi tên lên/xuống"
        >
          <i className="bi bi-grip-vertical"></i>
        </button>

        <div className="lesson-row-heading">
          {editing ? (
            <input
              ref={titleInputRef}
              type="text"
              className="form-control lesson-row-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  cancelRef.current = true;
                  e.currentTarget.blur();
                }
              }}
              maxLength={255}
              disabled={savingTitle}
              aria-label="Tên bài giảng"
            />
          ) : (
            <button
              type="button"
              className="lesson-row-title"
              onClick={() => setEditing(true)}
              disabled={disabled}
              title="Bấm để sửa tên bài giảng"
            >
              <span className="lesson-row-title-text">{lesson.title}</span>
            </button>
          )}

          <span className="lesson-row-kind">
            {LESSON_KIND_LABELS[kind]} · {contentLabel}
          </span>
        </div>

        {

}
        {kind === 'VIDEO' && (
          <button
            type="button"
            className={`lesson-row-preview${lesson.isPreview ? ' is-on' : ''}`}
            onClick={togglePreview}
            disabled={disabled || savingPreview}
            aria-pressed={lesson.isPreview}
            title={
              lesson.isPreview
                ? 'Học viên chưa mua vẫn xem được bài này. Bấm để tắt.'
                : 'Chỉ học viên đã mua mới xem được bài này. Bấm để cho xem thử.'
            }
          >
            <i className={`bi ${lesson.isPreview ? 'bi-eye-fill' : 'bi-eye-slash'}`}></i>
            {lesson.isPreview ? 'Xem thử' : 'Không xem thử'}
          </button>
        )}

        <button
          type="button"
          className="btn-lesson-icon btn-lesson-icon-danger"
          onClick={() => onDelete(lesson)}
          disabled={disabled}
          aria-label={`Xóa bài giảng ${lesson.title}`}
          title="Xóa bài giảng"
        >
          <i className="bi bi-trash3"></i>
        </button>

        {
}
        <button
          type="button"
          className={`lesson-row-toggle${expanded ? '' : ' is-collapsed'}`}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Thu gọn bài giảng' : 'Mở rộng bài giảng'}
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          <i className="bi bi-chevron-down"></i>
        </button>
      </div>

      <div className={`lesson-row-body${expanded ? '' : ' is-collapsed'}`}>
        {kind === 'VIDEO' ? (
          <LessonVideoList
            lesson={lesson}
            videos={videos}
            processingProgressByVideoId={processingProgressByVideoId}
            disabled={disabled}
            onVideosChange={onVideosChange}
          />
        ) : (
          <LessonQuestionList
            courseId={courseId}
            lesson={lesson}
            questions={questions}
            disabled={disabled}
            onQuestionsChange={onQuestionsChange}
          />
        )}
      </div>
    </li>
  );
};

export default LessonRow;
