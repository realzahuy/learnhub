import apiClient from './config';
import { Category } from '../../types/course.types';

export const categoryService = {
  getAll: async (signal?: AbortSignal): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>('/categories', {
      signal,
      showTopProgress: false,
    });
    return response.data;
  },

  create: async (name: string): Promise<Category> => {
    const response = await apiClient.post<Category>('/categories', { name });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};
