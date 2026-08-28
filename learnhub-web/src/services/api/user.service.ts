import apiClient from './config';
import { User } from '../../types/auth.types';

interface UpdateProfilePayload {
  fullName: string;
  bio: string;

  avatar?: File | null;
}

export const userService = {

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const formData = new FormData();
    formData.append('fullName', payload.fullName);
    formData.append('bio', payload.bio ?? '');
    if (payload.avatar) {
      formData.append('avatar', payload.avatar);
    }

    const response = await apiClient.put<User>('/users/me', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  upgradeToInstructor: async (): Promise<void> => {
    await apiClient.post('/users/upgrade-to-instructor');
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put('/users/me/password', { oldPassword, newPassword });
  },
};
