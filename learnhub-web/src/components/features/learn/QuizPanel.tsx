import { useCallback, useEffect, useMemo, useState } from 'react';
import { learningService } from '../../../services/api/learning.service';
import { Quiz, QuizResult } from '../../../types/quiz.types';
import { getApiErrorMessage } from '../../../utils';
import { PageSkeleton } from '../../common';
import './QuizPanel.css';

interface QuizPanelProps {
  lessonId: number;

  onQuizPassed: (lessonId: number, lessonCompleted: boolean) => void;

  onBestScoreChanged: (lessonId: number, bestScorePercent: number) => void;
}

type Selections = Record<number, number[]>;

const QuizPanel = ({ lessonId, onQuizPassed, onBestScoreChanged }: QuizPanelProps) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selections, setSelections] = useState<Selections>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    setSelections({});
    setResult(null);
    setSubmitError(null);

    learningService
      .getQuiz(lessonId)
      .then((data) => {
        if (cancelled) return;

        setQuiz(data);
        if (data.latestResult) {
          const savedSelections = Object.fromEntries(
            data.latestResult.questions.map((question) => [
              question.questionId,
              question.selectedAnswerIds,
            ])
          );
          setSelections(savedSelections);
          setResult(data.latestResult);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Không thể tải bài kiểm tra:', err);
        setError(getApiErrorMessage(err, 'Không tải được bài kiểm tra.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const resultOf = useCallback(
    (questionId: number) => result?.questions.find((item) => item.questionId === questionId) ?? null,
    [result]
  );

  const toggleOption = useCallback(
    (questionId: number, optionId: number, multiple: boolean) => {
      setSelections((prev) => {
        const current = prev[questionId] ?? [];

        if (!multiple) {
          return { ...prev, [questionId]: [optionId] };
        }

        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      });
    },
    []
  );

  const unansweredCount = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.filter((question) => (selections[question.id] ?? []).length === 0).length;
  }, [quiz, selections]);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;

    setSubmitting(true);
    setSubmitError(null);

    try {

      const data = await learningService.submitQuiz(lessonId, {
        answers: quiz.questions.map((question) => ({
          questionId: question.id,
          selectedAnswerIds: selections[question.id] ?? [],
        })),
      });

      setResult(data);
      onBestScoreChanged(lessonId, data.bestScorePercent);
      if (data.passed) {
        onQuizPassed(lessonId, data.lessonCompleted);
      }

      document.querySelector('.quiz-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Không thể nộp bài kiểm tra:', err);
      setSubmitError(getApiErrorMessage(err, 'Không nộp được bài. Thử lại nhé.'));
    } finally {
      setSubmitting(false);
    }
  }, [quiz, lessonId, selections, onBestScoreChanged, onQuizPassed]);

  const handleRetry = useCallback(() => {
    setSelections({});
    setResult(null);
    setSubmitError(null);
  }, []);

  if (loading) {
    return <PageSkeleton variant="list" count={4} className="quiz-panel" />;
  }

  if (error || !quiz) {
    return (
      <div className="quiz-panel quiz-panel-center quiz-error">
        <i className="bi bi-exclamation-triangle"></i>
        <p>{error ?? 'Không tải được bài kiểm tra.'}</p>
      </div>
    );
  }

  return (
    <div className="quiz-panel">
      <header className="quiz-head">
        <div>
          <p className="quiz-eyebrow">Bài kiểm tra</p>
          <h2 className="quiz-title">{quiz.lessonTitle}</h2>
        </div>
        <div className="quiz-meta">
          <span>{quiz.questions.length} câu</span>
          <span>Đạt từ {quiz.passPercent}%</span>
          {quiz.bestScorePercent !== null && <span>Điểm cao nhất: {quiz.bestScorePercent}%</span>}
        </div>
      </header>

      {result && (
        <div className={`quiz-result ${result.passed ? 'is-passed' : 'is-failed'}`}>
          <i className={`bi ${result.passed ? 'bi-patch-check-fill' : 'bi-x-circle-fill'}`}></i>
          <div>
            <p className="quiz-result-score">
              {result.correctCount}/{result.totalQuestions} câu đúng · {result.scorePercent}%
            </p>
            { }
            <p className="quiz-result-note">{result.passed ? 'Đạt' : 'Chưa đạt'}</p>
          </div>
        </div>
      )}

      <ol className="quiz-question-list">
        {quiz.questions.map((question, index) => {
          const selected = selections[question.id] ?? [];
          const graded = resultOf(question.id);

          return (
            <li
              key={question.id}
              className={`quiz-question${graded ? (graded.correct ? ' is-correct' : ' is-wrong') : ''}`}
            >
              {
}
              <div className="quiz-question-head">
                <span className="quiz-question-index">Câu {index + 1}</span>
                {question.multipleCorrect && (
                  <span className="quiz-badge">Chọn nhiều đáp án</span>
                )}
              </div>

              <p className="quiz-question-text">{question.question}</p>

              <ul className="quiz-option-list">
                {question.options.map((option) => {
                  const checked = selected.includes(option.id);

                  const isCorrectAnswer = graded?.correctAnswerIds.includes(option.id) ?? false;
                  const isWrongPick = Boolean(graded) && checked && !isCorrectAnswer;

                  return (
                    <li key={option.id}>
                      <label
                        className={`quiz-option${checked ? ' is-checked' : ''}${
                          isCorrectAnswer ? ' is-answer' : ''
                        }${isWrongPick ? ' is-wrong-pick' : ''}${graded ? ' is-locked' : ''}`}
                      >
                        <input
                          type={question.multipleCorrect ? 'checkbox' : 'radio'}
                          className={`form-check-input${
                            question.multipleCorrect ? '' : ' quiz-option-radio'
                          }`}
                          name={`question-${question.id}`}
                          checked={checked}
                          disabled={Boolean(graded)}
                          onChange={() =>
                            toggleOption(question.id, option.id, question.multipleCorrect)
                          }
                        />
                        <span className="quiz-option-text">{option.answer}</span>
                        {isCorrectAnswer && <i className="bi bi-check-circle-fill"></i>}
                        {isWrongPick && <i className="bi bi-x-circle-fill"></i>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {submitError && <p className="quiz-submit-error">{submitError}</p>}

      <footer className="quiz-actions">
        {result ? (
          <button type="button" className="btn btn-notion" onClick={handleRetry}>
            <i className="bi bi-arrow-clockwise"></i> Làm lại
          </button>
        ) : (
          <>
            {unansweredCount > 0 && (
              <span className="quiz-unanswered">Còn {unansweredCount} câu chưa trả lời</span>
            )}
            <button
              type="button"
              className="btn btn-notion"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </>
        )}
      </footer>
    </div>
  );
};

export default QuizPanel;
