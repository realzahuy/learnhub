import apiClient from './config';
import { EmailVerificationStatus } from '../../types/emailVerification.types';

export const emailVerificationService = {

  send: async (): Promise<EmailVerificationStatus> => {
    const response = await apiClient.post<EmailVerificationStatus>(
      '/users/email-verification/send'
    );
    return response.data;
  },

  confirm: async (code: string): Promise<void> => {
    await apiClient.post('/users/email-verification/confirm', { code });
  },
};
