import '../../common/PageSkeleton.css';
import './QuizPanel.css';
import './QuizSkeleton.css';

const QuizSkeleton = () => (
  <div className="quiz-panel app-skeleton quiz-skeleton" role="status" aria-label="Đang tải bài kiểm tra" aria-busy="true">
    <div aria-hidden="true">
      <header className="quiz-head">
        <div className="quiz-skeleton-heading">
          <span className="quiz-skeleton-line quiz-skeleton-short" />
          <span className="quiz-skeleton-line quiz-skeleton-title" />
        </div>
        <div className="quiz-meta">
          <span className="quiz-skeleton-line quiz-skeleton-short" />
        </div>
      </header>
      <div className="quiz-question-list">
        <div className="quiz-question">
          <div className="quiz-question-head">
            <span className="quiz-skeleton-line quiz-skeleton-short" />
          </div>
          <div className="quiz-question-text">
            <span className="quiz-skeleton-line" />
          </div>
          <div className="quiz-option-list">
            {[0, 1, 2, 3].map((option) => (
              <div key={option} className="quiz-option is-locked">
                <span className="quiz-skeleton-radio" />
                <span className="quiz-skeleton-line quiz-option-text" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <footer className="quiz-actions">
        <span className="quiz-skeleton-button" />
      </footer>
    </div>
  </div>
);

export default QuizSkeleton;
