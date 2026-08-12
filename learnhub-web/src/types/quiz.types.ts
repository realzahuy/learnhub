
export interface QuizOption {
  id: number;
  answer: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  position: number;

  multipleCorrect: boolean;
  options: QuizOption[];
}

export interface Quiz {
  lessonId: number;
  lessonTitle: string;
  passPercent: number;
  questions: QuizQuestion[];

  bestScorePercent: number | null;
  attemptCount: number;

  latestResult: QuizResult | null;
}

export interface QuizQuestionResult {
  questionId: number;
  correct: boolean;
  correctAnswerIds: number[];
  selectedAnswerIds: number[];
}

export interface QuizResult {
  correctCount: number;
  totalQuestions: number;
  scorePercent: number;
  passPercent: number;
  passed: boolean;
  bestScorePercent: number;

  lessonCompleted: boolean;
  questions: QuizQuestionResult[];
}

export interface QuizSubmission {
  answers: {
    questionId: number;
    selectedAnswerIds: number[];
  }[];
}
