import apiClient from './config';

export interface PasswordResetStatus {

  message: string;

  expiresInSeconds: number;

  resendAfterSeconds: number;
}

export const passwordResetService = {

  forgotPassword: async (email: string): Promise<PasswordResetStatus> => {
    const response = await apiClient.post<PasswordResetStatus>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    await apiClient.post('/auth/reset-password', {
      email,
      code,
      newPassword,
    });
  },
};
