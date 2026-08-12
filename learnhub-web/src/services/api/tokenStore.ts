let accessToken: string | null = null;
let generation = 0;

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');

type AuthMessage =
  | { type: 'access-token'; token: string }
  | { type: 'logout' };

const authChannel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('learnhub-auth');

authChannel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => {
  if (event.data.type === 'access-token') {
    accessToken = event.data.token;
  } else if (event.data.type === 'logout') {
    accessToken = null;
    generation += 1;
  }
});

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string): void => {
  accessToken = token;
  authChannel?.postMessage({ type: 'access-token', token } satisfies AuthMessage);
};

export const clearAccessToken = (): void => {
  accessToken = null;
  generation += 1;
  authChannel?.postMessage({ type: 'logout' } satisfies AuthMessage);
};

export const getAuthGeneration = (): number => generation;

export const setAccessTokenForGeneration = (
  token: string,
  expectedGeneration: number
): boolean => {
  if (generation !== expectedGeneration) return false;
  accessToken = token;
  authChannel?.postMessage({ type: 'access-token', token } satisfies AuthMessage);
  return true;
};
