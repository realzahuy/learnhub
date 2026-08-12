
export interface ApiProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string>;
  suggestions?: string[];
}

const getProblemDetail = (err: unknown): ApiProblemDetail | undefined =>
  (err as { response?: { data?: ApiProblemDetail } })?.response?.data;

export const getApiFieldErrors = (err: unknown): Record<string, string> | undefined =>
  getProblemDetail(err)?.errors;

export const getApiSuggestions = (err: unknown): string[] | undefined =>
  getProblemDetail(err)?.suggestions;

export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const problem = getProblemDetail(err);
  const firstFieldMessage = problem?.errors && Object.values(problem.errors)[0];
  return firstFieldMessage || problem?.detail || fallback;
};
