import React, { useCallback, useEffect, useRef, useState } from 'react';
import LessonVideoList from './LessonVideoList';
import LessonQuestionList from './LessonQuestionList';
import { Lesson, Video } from '../../../types/lesson.types';
import { Question } from '../../../types/question.types';
import { Dropdown, DropdownOption } from '../../common';

type AddContentKind = 'VIDEO' | 'QUESTION';
type DragItemProps = React.HTMLAttributes<HTMLLIElement> & { draggable: boolean };
type DragHandleProps = React.HTMLAttributes<HTMLButtonElement>;

const ADD_CONTENT_OPTIONS: DropdownOption[] = [
  { value: 'VIDEO', label: 'Thêm video' },
  { value: 'QUESTION', label: 'Thêm câu hỏi' },
];

interface LessonRowProps {
  courseId: number;
  lesson: Lesson;

  videos: Video[];
  processingProgressByVideoId: Record<number, number>;
  questions: Question[];
  disabled: boolean;

  isDragging: boolean;

  isDropTarget: boolean;

  getDragItemProps: (id: number) => DragItemProps;

  getDragHandleProps: (id: number) => DragHandleProps;

  onRename: (lesson: Lesson, title: string) => Promise<boolean>;

  onTogglePreview: (lesson: Lesson) => Promise<boolean>;
  onVideosChange: (lessonId: number, updater: (prev: Video[]) => Video[]) => void;
  onQuestionsChange: (lessonId: number, questions: Question[]) => void;
  onDelete: (lesson: Lesson) => void;
}

const LessonRow: React.FC<LessonRowProps> = ({
  courseId,
  lesson,
  videos,
  processingProgressByVideoId,
  questions,
  disabled,
  isDragging,
  isDropTarget,
  getDragItemProps,
  getDragHandleProps,
  onRename,
  onTogglePreview,
  onVideosChange,
  onQuestionsChange,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [addingContent, setAddingContent] = useState<AddContentKind | null>(null);

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

  const finishAddingContent = useCallback(() => setAddingContent(null), []);

  const togglePreview = async () => {
    setSavingPreview(true);
    await onTogglePreview(lesson);
    setSavingPreview(false);
  };

  const contentLabel = videos.length === 0 && questions.length === 0
    ? 'Chưa có nội dung'
    : `${videos.length} video · ${questions.length} câu hỏi`;
  const dragItemProps = getDragItemProps(lesson.id);
  const dragHandleProps = getDragHandleProps(lesson.id);

  return (
    <li
      className={`lesson-row${isDragging ? ' is-dragging' : ''}${
        isDropTarget ? ' is-drop-target' : ''
      }`}
      {...dragItemProps}
      draggable={dragItemProps.draggable && !disabled}
    >
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
            {contentLabel}
          </span>
        </div>

        <button
          type="button"
          className={`lesson-row-preview${lesson.isPreview ? ' is-on' : ''}`}
          onClick={togglePreview}
          disabled={disabled || savingPreview}
          aria-pressed={lesson.isPreview}
          title={
            lesson.isPreview
              ? 'Học viên chưa mua vẫn xem được video của bài này. Bấm để tắt.'
              : 'Chỉ học viên đã mua mới xem được video của bài này. Bấm để cho xem thử.'
          }
        >
          <i className={`bi ${lesson.isPreview ? 'bi-eye-fill' : 'bi-eye-slash'}`}></i>
          {lesson.isPreview ? 'Xem thử' : 'Không xem thử'}
        </button>

        <button
          type="button"
          className="btn-lesson-icon btn-lesson-icon-danger"
          onClick={() => onDelete(lesson)}
          disabled={disabled}
          aria-label={`Xóa bài giảng ${lesson.title}`}
          title="Xóa bài giảng"
        >
          Xóa
        </button>

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
        <div className="lesson-content-add">
          <Dropdown
            value=""
            options={ADD_CONTENT_OPTIONS}
            placeholder="+ Thêm nội dung"
            className="lesson-content-add-dropdown"
            ariaLabel={`Thêm nội dung cho bài giảng ${lesson.title}`}
            disabled={disabled || addingContent !== null}
            onChange={(value) => {
              setAddingContent(value as AddContentKind);
              setExpanded(true);
            }}
          />
        </div>

        {(videos.length > 0 || addingContent === 'VIDEO') && (
          <section className="lesson-content-section">
            <h3 className="lesson-content-title">Video bài giảng</h3>
            <LessonVideoList
              lesson={lesson}
              videos={videos}
              processingProgressByVideoId={processingProgressByVideoId}
              disabled={disabled}
              isAdding={addingContent === 'VIDEO'}
              onVideosChange={onVideosChange}
              onAddFinished={finishAddingContent}
            />
          </section>
        )}

        {(questions.length > 0 || addingContent === 'QUESTION') && (
          <section className="lesson-content-section">
            <h3 className="lesson-content-title">Câu hỏi trắc nghiệm</h3>
            <LessonQuestionList
              lesson={lesson}
              questions={questions}
              disabled={disabled}
              isAdding={addingContent === 'QUESTION'}
              onQuestionsChange={onQuestionsChange}
              onAddFinished={finishAddingContent}
            />
          </section>
        )}

      </div>
    </li>
  );
};

const areLessonRowPropsEqual = (previous: LessonRowProps, next: LessonRowProps) => {
  if (previous.courseId !== next.courseId
      || previous.lesson !== next.lesson
      || previous.videos !== next.videos
      || previous.questions !== next.questions
      || previous.disabled !== next.disabled
      || previous.isDragging !== next.isDragging
      || previous.isDropTarget !== next.isDropTarget
      || previous.getDragItemProps !== next.getDragItemProps
      || previous.getDragHandleProps !== next.getDragHandleProps
      || previous.onRename !== next.onRename
      || previous.onTogglePreview !== next.onTogglePreview
      || previous.onVideosChange !== next.onVideosChange
      || previous.onQuestionsChange !== next.onQuestionsChange
      || previous.onDelete !== next.onDelete) {
    return false;
  }

  return next.videos.every((video) => (
    previous.processingProgressByVideoId[video.id]
      === next.processingProgressByVideoId[video.id]
  ));
};

export default React.memo(LessonRow, areLessonRowPropsEqual);
