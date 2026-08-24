import apiClient, { cancelPendingRefresh, refreshAuthSession } from './config';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../../types/auth.types';

export const authService = {
  register: async (payload: RegisterRequest): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register', payload);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    setAccessToken(response.data.accessToken, response.data.user);
    return response.data;
  },

  getCurrentUser: async (signal?: AbortSignal): Promise<User> => {
    const response = await apiClient.get<User>('/users/me', { signal });
    return response.data;
  },

  refreshTokens: async (): Promise<LoginResponse> => refreshAuthSession(),

  logout: async (): Promise<void> => {
    cancelPendingRefresh();
    await apiClient.post('/auth/logout');
  },

  logoutOtherDevices: async (): Promise<number> => {
    const response = await apiClient.post<{ loggedOutSessions: number }>(
      '/users/me/sessions/logout-others'
    );
    return response.data.loggedOutSessions;
  },

  clearAuth: (): void => {
    clearAccessToken();
  },

  getAccessToken,
};
