const ACCOUNT_LOCKED_MESSAGE =
  'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';

export const ACCOUNT_LOCKED_EVENT = 'learnhub:account-locked';
const ACCOUNT_LOCKED_CODE = 'ACCOUNT_LOCKED';

export interface AccountLockedEventDetail {
  message: string;
}

export const notifyAccountLocked = (message = ACCOUNT_LOCKED_MESSAGE): void => {
  window.dispatchEvent(
    new CustomEvent<AccountLockedEventDetail>(ACCOUNT_LOCKED_EVENT, {
      detail: { message },
    })
  );
};

interface AccountLockedProblem {
  code?: string;
  detail?: string;
}

const problemFrom = (error: unknown): AccountLockedProblem | undefined =>
  (error as { response?: { data?: AccountLockedProblem } })?.response?.data;

const responseStatusFrom = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

export const isAccountLockedError = (error: unknown): boolean =>
  problemFrom(error)?.code === ACCOUNT_LOCKED_CODE;

export const isRefreshSessionRejected = (error: unknown): boolean =>
  responseStatusFrom(error) === 401;

export const accountLockedMessageFrom = (error: unknown): string =>
  problemFrom(error)?.detail || ACCOUNT_LOCKED_MESSAGE;
