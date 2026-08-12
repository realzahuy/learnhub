
export interface Answer {
  id: number;
  answer: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  question: string;

  position: number;
  lessonId: number;
  answers: Answer[];
}

export interface QuestionReorderPayload {
  id: number;
  position: number;
}

export interface AnswerPayload {
  answer: string;
  isCorrect: boolean;
}

export interface QuestionPayload {
  question: string;
  answers: AnswerPayload[];
}

export const MIN_ANSWERS = 2;
export const MAX_ANSWERS = 10;
