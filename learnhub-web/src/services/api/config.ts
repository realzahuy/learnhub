import axios, { InternalAxiosRequestConfig } from 'axios';
import {
  clearAccessToken,
  getAccessToken,
  getAuthGeneration,
  setAccessTokenForGeneration,
} from './tokenStore';
import { ROUTE_PATHS } from '../../routes/paths';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RefreshResponse {
  accessToken: string;
}

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string> | null = null;
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

export const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  const tokenBeforeLock = getAccessToken();
  const generation = getAuthGeneration();

  const performRefresh = () => {
    const tokenFromAnotherTab = getAccessToken();
    if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeLock) {
      return Promise.resolve(tokenFromAnotherTab);
    }

    refreshController = new AbortController();
    return axios
      .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, undefined, {
        withCredentials: true,
        signal: refreshController.signal,
      })
      .then(({ data }) => {
        if (!setAccessTokenForGeneration(data.accessToken, generation)) {
          throw new Error('Phiên đăng nhập đã thay đổi');
        }
        return data.accessToken;
      })
      .catch(async (error) => {
        await new Promise((resolve) => window.setTimeout(resolve, 75));
        const tokenFromAnotherTab = getAccessToken();
        if (tokenFromAnotherTab && tokenFromAnotherTab !== tokenBeforeLock) {
          return tokenFromAnotherTab;
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
    clearSessionAndRedirect();
    throw error;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest | undefined;
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
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
