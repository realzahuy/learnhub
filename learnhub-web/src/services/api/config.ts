import axios, { InternalAxiosRequestConfig } from 'axios';
import {
  clearAccessToken,
  getAccessToken,
  getAuthenticatedUser,
  getAuthGeneration,
  setAccessTokenForGeneration,
} from './tokenStore';
import { ROUTE_PATHS } from '../../routes/paths';
import { LoginResponse } from '../../types/auth.types';
import { beginNetworkActivity } from '../networkActivity';
import {
  accountLockedMessageFrom,
  isAccountLockedError,
  isRefreshSessionRejected,
  notifyAccountLocked,
} from '../authSessionEvents';
import { buildApiUrl, runtimeConfig } from '../../config/runtimeConfig';
import { uiConfig } from '../../config/uiConfig';

export const apiClient = axios.create({
  baseURL: runtimeConfig.apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _finishLoading?: () => void;
};

let refreshPromise: Promise<LoginResponse> | null = null;
let refreshController: AbortController | null = null;

type LockCapableNavigator = Navigator & {
  locks?: {
    request<T>(name: string, callback: () => Promise<T>): Promise<T>;
  };
};

const clearSessionAndRedirect = () => {
  clearAccessToken();
  window.location.href = ROUTE_PATHS.home;
};

export const refreshAuthSession = (): Promise<LoginResponse> => {
  if (refreshPromise) return refreshPromise;

  const tokenBeforeLock = getAccessToken();
  const generation = getAuthGeneration();

  const performRefresh = () => {
    const tokenFromAnotherTab = getAccessToken();
    const userFromAnotherTab = getAuthenticatedUser();
    if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeLock && userFromAnotherTab) {
      return Promise.resolve({ accessToken: tokenFromAnotherTab, user: userFromAnotherTab });
    }

    refreshController = new AbortController();
    return axios
      .post<LoginResponse>(buildApiUrl('auth/refresh'), undefined, {
        withCredentials: true,
        signal: refreshController.signal,
        headers: tokenBeforeLock
          ? { Authorization: `Bearer ${tokenBeforeLock}` }
          : undefined,
      })
      .then(({ data }) => {
        if (!setAccessTokenForGeneration(data.accessToken, data.user, generation)) {
          throw new Error('Phiên đăng nhập đã thay đổi');
        }
        return data;
      })
      .catch(async (error) => {
        await new Promise((resolve) =>
          window.setTimeout(resolve, uiConfig.timing.authRefreshSettleMs)
        );
        const tokenFromAnotherTab = getAccessToken();
        const userFromAnotherTab = getAuthenticatedUser();
        if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeLock && userFromAnotherTab) {
          return { accessToken: tokenFromAnotherTab, user: userFromAnotherTab };
        }
        if (isAccountLockedError(error)) {
          notifyAccountLocked(accountLockedMessageFrom(error));
        }
        throw error;
      });
  };

  const locks = (navigator as LockCapableNavigator).locks;
  refreshPromise = (locks
    ? locks.request('learnhub-refresh', performRefresh)
    : performRefresh()
  ).finally(() => {
    refreshPromise = null;
    refreshController = null;
  });

  return refreshPromise;
};

export const refreshAccessToken = async (): Promise<string> =>
  (await refreshAuthSession()).accessToken;

export const cancelPendingRefresh = (): void => {
  refreshController?.abort();
};

export const authenticatedFetch = async (
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> => {
  const send = (accessToken: string | null) => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(input, { ...init, credentials: 'include', headers });
  };

  let response = await send(getAccessToken());
  if (response.status !== 401) return response;

  try {
    response = await send(await refreshAccessToken());
    return response;
  } catch (error) {
    if (isRefreshSessionRejected(error) && !isAccountLockedError(error)) {
      clearSessionAndRedirect();
    }
    throw error;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const request = config as RetryableRequest;
    if (request.method?.toLowerCase() === 'get' && request.showTopProgress !== false) {
      request._finishLoading = beginNetworkActivity();
    }
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    (error.config as RetryableRequest | undefined)?._finishLoading?.();
    return Promise.reject(error);
  }
);

const finishRequestLoading = (config?: RetryableRequest) => {
  config?._finishLoading?.();
  if (config) delete config._finishLoading;
};

apiClient.interceptors.response.use(
  (response) => {
    finishRequestLoading(response.config as RetryableRequest);
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    finishRequestLoading(originalRequest);
    const isAuthRequest = originalRequest?.url?.includes('/auth/') ?? false;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (
          isRefreshSessionRejected(refreshError)
          && !isAccountLockedError(refreshError)
        ) {
          clearSessionAndRedirect();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
