import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lesson } from '../../../types/lesson.types';
import {
  MAX_ANSWERS,
  MIN_ANSWERS,
  Question,
  QuestionPayload,
} from '../../../types/question.types';
import { questionService } from '../../../services/api/question.service';
import { useDragReorder } from '../../../hooks/useDragReorder';
import { getApiErrorMessage } from '../../../utils';

interface LessonQuestionListProps {
  lesson: Lesson;
  questions: Question[];
  disabled: boolean;
  isAdding: boolean;
  onQuestionsChange: (lessonId: number, updater: (previous: Question[]) => Question[]) => void;
  onAddFinished: () => void;
  onBusyChange: (busy: boolean) => void;
}

interface DraftAnswer {
  clientId: string;
  answer: string;
  isCorrect: boolean;
}

interface DraftQuestion {

  id: number | null;
  question: string;
  answers: DraftAnswer[];
}

const INITIAL_ANSWER_COUNT = 4;

const newDraftAnswer = (): DraftAnswer => ({
  clientId: `new-${crypto.randomUUID()}`,
  answer: '',
  isCorrect: false,
});

const emptyDraft = (): DraftQuestion => ({
  id: null,
  question: '',
  answers: Array.from({ length: INITIAL_ANSWER_COUNT }, newDraftAnswer),
});

const toDraft = (question: Question): DraftQuestion => ({
  id: question.id,
  question: question.question,
  answers: question.answers.map((answer) => ({
    clientId: `saved-${answer.id}`,
    answer: answer.answer,
    isCorrect: answer.isCorrect,
  })),
});

const validateDraft = (draft: DraftQuestion): string | null => {
  if (!draft.question.trim()) return 'Nội dung câu hỏi không được để trống';
  const filled = draft.answers.filter((a) => a.answer.trim());
  if (filled.length < MIN_ANSWERS) return `Câu hỏi cần ít nhất ${MIN_ANSWERS} đáp án`;
  if (!filled.some((a) => a.isCorrect)) return 'Phải chọn ít nhất một đáp án đúng';
  return null;
};

const LessonQuestionList: React.FC<LessonQuestionListProps> = ({
  lesson,
  questions,
  disabled,
  isAdding,
  onQuestionsChange,
  onAddFinished,
  onBusyChange,
}) => {
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationRef = useRef(false);
  const ownBusy = saving || savingOrder || deleting;

  useEffect(() => {
    onBusyChange(ownBusy);
  }, [onBusyChange, ownBusy]);

  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  useEffect(() => {
    if (isAdding && draft === null) {
      setError(null);
      setDraft(emptyDraft());
    }
  }, [draft, isAdding]);

  const rollbackRef = useRef<Question[] | null>(null);

  const saveOrder = useCallback(
    async (order: Question[]) => {
      try {
        const saved = await questionService.reorder(
          lesson.id,
          order.map((question) => ({ id: question.id, position: question.position }))
        );
        const positions = new Map(saved.map((question) => [question.id, question.position]));
        onQuestionsChange(lesson.id, (current) => current
          .map((question) => positions.has(question.id)
            ? { ...question, position: positions.get(question.id) as number }
            : question)
          .sort((first, second) => first.position - second.position));
        rollbackRef.current = null;
      } catch (err) {
        const rollback = rollbackRef.current;
        rollbackRef.current = null;
        if (rollback) {
          const positions = new Map(rollback.map((question) => [question.id, question.position]));
          onQuestionsChange(lesson.id, (current) => current
            .map((question) => positions.has(question.id)
              ? { ...question, position: positions.get(question.id) as number }
              : question)
            .sort((first, second) => first.position - second.position));
        }
        setError(getApiErrorMessage(err, 'Không đổi được thứ tự câu hỏi. Vui lòng thử lại.'));
      } finally {
        operationRef.current = false;
        setSavingOrder(false);
      }
    },
    [lesson.id, onQuestionsChange]
  );

  const applyOrder = useCallback(
    (next: Question[]) => {
      if (disabled || operationRef.current) return;
      operationRef.current = true;
      setSavingOrder(true);
      rollbackRef.current = questions;

      const renumbered = next.map((question, index) => ({ ...question, position: index + 1 }));
      setError(null);
      onQuestionsChange(lesson.id, () => renumbered);
      void saveOrder(renumbered);
    },
    [disabled, lesson.id, questions, onQuestionsChange, saveOrder]
  );

  const drag = useDragReorder(questions, applyOrder);

  const updateDraft = useCallback((patch: Partial<DraftQuestion>) => {
    setError(null);
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const updateAnswer = useCallback((index: number, patch: Partial<DraftAnswer>) => {
    setError(null);
    setDraft((prev) => {
      if (!prev) return prev;
      const answers = prev.answers.map((a, i) => (i === index ? { ...a, ...patch } : a));
      return { ...prev, answers };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft || disabled || operationRef.current) return;

    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: QuestionPayload = {
      question: draft.question.trim(),
      answers: draft.answers
        .filter((a) => a.answer.trim())
        .map((a) => ({ answer: a.answer.trim(), isCorrect: a.isCorrect })),
    };

    operationRef.current = true;
    setSaving(true);
    setError(null);
    try {
      if (draft.id === null) {
        const created = await questionService.create(lesson.id, payload);
        onQuestionsChange(lesson.id, (previous) => [...previous, created]);
        onAddFinished();
      } else {
        const updated = await questionService.update(draft.id, payload);
        onQuestionsChange(lesson.id, (previous) =>
          previous.map((question) => (question.id === updated.id ? updated : question))
        );
      }
      setDraft(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không lưu được câu hỏi. Vui lòng thử lại.'));
    } finally {
      operationRef.current = false;
      setSaving(false);
    }
  }, [disabled, draft, lesson.id, onQuestionsChange, onAddFinished]);

  const handleDelete = useCallback(
    async (question: Question) => {
      if (disabled || operationRef.current) return;
      operationRef.current = true;
      setDeleting(true);
      setError(null);
      try {
        await questionService.remove(question.id);
        onQuestionsChange(lesson.id, (previous) =>
          previous.filter((current) => current.id !== question.id)
        );
      } catch (err) {
        setError(getApiErrorMessage(err, 'Không xóa được câu hỏi. Vui lòng thử lại.'));
      } finally {
        operationRef.current = false;
        setDeleting(false);
      }
    },
    [disabled, lesson.id, onQuestionsChange]
  );

  const busy = disabled || ownBusy;

  return (
    <div className="lesson-media">
      {questions.length === 0 && !draft ? (
        <p className="lesson-media-empty">
          <i className="bi bi-patch-question"></i>
          Chưa có câu hỏi
        </p>
      ) : (
        <ol className="lesson-media-list">
          {questions.map((question) => {
            const itemProps = drag.itemProps(question.id);

            return (
              <li
                className={`lesson-media-item${drag.isDragging(question.id) ? ' is-dragging' : ''}${
                  drag.isDropTarget(question.id) ? ' is-drop-target' : ''
                }`}
                key={question.id}
                {...itemProps}
                draggable={itemProps.draggable && !busy}
              >
                <button
                  type="button"
                  className="lesson-row-handle lesson-media-handle"
                  {...drag.handleProps(question.id)}
                  disabled={busy}
                  aria-label={`Đổi vị trí câu hỏi ${question.question}`}
                  title="Kéo để đổi vị trí, hoặc dùng phím mũi tên lên/xuống"
                >
                  <i className="bi bi-grip-vertical"></i>
                </button>

                <button
                  type="button"
                  className="lesson-media-body lesson-question-toggle"
                  onClick={() => {
                    setError(null);
                    setDraft(toDraft(question));
                  }}
                  disabled={busy}
                  aria-expanded={draft?.id === question.id}
                  title="Bấm để mở và sửa câu hỏi"
                >
                  <span>
                    <span className="lesson-media-title">{question.question}</span>
                    <span className="lesson-status lesson-status-ready">
                      {question.answers.length} đáp án,{' '}
                      {question.answers.filter((answer) => answer.isCorrect).length} đáp án đúng
                    </span>
                  </span>
                  <i className={`bi bi-chevron-down lesson-question-chevron${draft?.id === question.id ? ' is-open' : ''}`} />
                </button>
                <button
                  type="button"
                  className="btn-lesson-icon btn-lesson-icon-danger"
                  onClick={() => handleDelete(question)}
                  disabled={busy}
                  aria-label={`Xóa câu hỏi ${question.question}`}
                  title="Xóa câu hỏi"
                >
                  Xóa
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {draft && (
        <div className="question-draft">
          <input
            type="text"
            className="form-control"
            placeholder="Nội dung câu hỏi"
            value={draft.question}
            onChange={(e) => updateDraft({ question: e.target.value })}
            maxLength={1000}
            disabled={busy}
          />

          <ul className="question-draft-answers">
            {draft.answers.map((answer, index) => (

              <li className="question-draft-answer" key={answer.clientId}>
                <label className="question-draft-correct" title="Đánh dấu đáp án đúng">
                  <input
                    type="checkbox"
                    checked={answer.isCorrect}
                    onChange={(e) => updateAnswer(index, { isCorrect: e.target.checked })}
                    disabled={busy}
                  />
                </label>

                <input
                  type="text"
                  className="form-control"
                  placeholder={`Đáp án ${index + 1}`}
                  value={answer.answer}
                  onChange={(e) => updateAnswer(index, { answer: e.target.value })}
                  maxLength={500}
                  disabled={busy}
                />

                {draft.answers.length > MIN_ANSWERS && (
                  <button
                    type="button"
                    className="btn-lesson-icon btn-lesson-icon-danger"
                    onClick={() =>
                      updateDraft({ answers: draft.answers.filter((_, i) => i !== index) })
                    }
                    disabled={busy}
                    aria-label={`Xóa đáp án ${index + 1}`}
                  >
                    Xóa
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="question-draft-actions">
            <button
              type="button"
              className="btn-lesson-add-inline"
              onClick={() =>
                updateDraft({ answers: [...draft.answers, newDraftAnswer()] })
              }
              disabled={busy || draft.answers.length >= MAX_ANSWERS}
              title={
                draft.answers.length >= MAX_ANSWERS
                  ? `Tối đa ${MAX_ANSWERS} đáp án`
                  : undefined
              }
            >
              <i className="bi bi-plus-lg"></i>
              Thêm đáp án
            </button>

            <div className="question-draft-actions-right">
              <button
                type="button"
                className="btn-lesson-ghost"
                onClick={() => {
                  const wasCreating = draft.id === null;
                  setError(null);
                  setDraft(null);
                  if (wasCreating) onAddFinished();
                }}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-lesson-add"
                onClick={handleSave}
                disabled={busy}
              >
                {saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <span className="lesson-media-error">{error}</span>}

    </div>
  );
};

export default React.memo(LessonQuestionList);
