import { AuthenticatedUser } from '../../types/auth.types';

let accessToken: string | null = null;
let authenticatedUser: AuthenticatedUser | null = null;
let generation = 0;

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');

type AuthMessage =
  | { type: 'access-token'; token: string; user: AuthenticatedUser }
  | { type: 'logout' };

const authChannel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('learnhub-auth');

authChannel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data.type === 'access-token') {
    accessToken = event.data.token;
    authenticatedUser = event.data.user;
  } else if (event.data.type === 'logout') {
    accessToken = null;
    authenticatedUser = null;
    generation += 1;
  }
});

export const getAccessToken = (): string | null => accessToken;
export const getAuthenticatedUser = (): AuthenticatedUser | null => authenticatedUser;

export const setAccessToken = (token: string, user: AuthenticatedUser): void => {
  accessToken = token;
  authenticatedUser = user;
  authChannel?.postMessage({ type: 'access-token', token, user } satisfies AuthMessage);
};

export const clearAccessToken = (): void => {
  accessToken = null;
  authenticatedUser = null;
  generation += 1;
  authChannel?.postMessage({ type: 'logout' } satisfies AuthMessage);
};

export const getAuthGeneration = (): number => generation;

export const setAccessTokenForGeneration = (
  token: string,
  user: AuthenticatedUser,
  expectedGeneration: number
): boolean => {
  if (generation !== expectedGeneration) return false;
  accessToken = token;
  authenticatedUser = user;
  authChannel?.postMessage({ type: 'access-token', token, user } satisfies AuthMessage);
  return true;
};
