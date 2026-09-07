import { AuthenticatedUser } from '../../types/auth.types';
import { getUserIdFromToken } from '../../utils/jwt';

let accessToken: string | null = null;
let authenticatedUser: AuthenticatedUser | null = null;
let generation = 0;

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');

type AuthMessage =
  | { type: 'access-token'; token: string; user: AuthenticatedUser }
  | { type: 'logout' };

export interface AuthSessionSnapshot {
  token: string | null;
  user: AuthenticatedUser | null;
  userId: number | null;
}

type AuthSessionListener = (session: AuthSessionSnapshot) => void;
const listeners = new Set<AuthSessionListener>();

const authChannel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('learnhub-auth');

const notifyListeners = () => {
  const session = {
    token: accessToken,
    user: authenticatedUser,
    userId: getUserIdFromToken(accessToken),
  };
  listeners.forEach((listener) => listener(session));
};

const applyAccessToken = (
  token: string,
  user: AuthenticatedUser,
  broadcast: boolean
) => {
  if (getUserIdFromToken(accessToken) !== getUserIdFromToken(token)) {
    generation += 1;
  }
  accessToken = token;
  authenticatedUser = user;
  notifyListeners();
  if (broadcast) {
    authChannel?.postMessage({ type: 'access-token', token, user } satisfies AuthMessage);
  }
};

const applyLogout = (broadcast: boolean) => {
  accessToken = null;
  authenticatedUser = null;
  generation += 1;
  notifyListeners();
  if (broadcast) authChannel?.postMessage({ type: 'logout' } satisfies AuthMessage);
};

authChannel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data.type === 'access-token') {
    applyAccessToken(event.data.token, event.data.user, false);
  } else if (event.data.type === 'logout') {
    applyLogout(false);
  }
});

export const getAccessToken = (): string | null => accessToken;
export const getAuthenticatedUser = (): AuthenticatedUser | null => authenticatedUser;

export const setAccessToken = (token: string, user: AuthenticatedUser): void => {
  applyAccessToken(token, user, true);
};

export const clearAccessToken = (): void => {
  applyLogout(true);
};

export const setAuthenticatedUser = (user: AuthenticatedUser): void => {
  if (!accessToken) return;
  applyAccessToken(accessToken, user, true);
};

export const subscribeAuthSession = (listener: AuthSessionListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAuthGeneration = (): number => generation;

export const setAccessTokenForGeneration = (
  token: string,
  user: AuthenticatedUser,
  expectedGeneration: number
): boolean => {
  if (generation !== expectedGeneration) return false;
  applyAccessToken(token, user, true);
  return true;
};
