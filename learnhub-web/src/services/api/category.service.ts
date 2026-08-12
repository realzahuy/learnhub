import apiClient from './config';
import { Category } from '../../types/course.types';

let categoryCache: Category[] | null = null;
let categoryRequest: Promise<Category[]> | null = null;

const replaceCachedCategory = (updated: Category) => {
  if (!categoryCache) return;
  categoryCache = categoryCache.map((category) =>
    category.id === updated.id ? updated : category
  );
};

export const categoryService = {

  getCached: (): Category[] | null => categoryCache,

  getAll: async (): Promise<Category[]> => {
    if (categoryCache) return categoryCache;
    if (categoryRequest) return categoryRequest;

    categoryRequest = apiClient
      .get<Category[]>('/categories')
      .then((response) => {
        categoryCache = response.data;
        return categoryCache;
      })
      .finally(() => {
        categoryRequest = null;
      });
    return categoryRequest;
  },

  create: async (name: string): Promise<Category> => {
    const response = await apiClient.post<Category>('/categories', { name });
    if (categoryCache) categoryCache = [...categoryCache, response.data];
    return response.data;
  },

  update: async (id: number, name: string): Promise<Category> => {
    const response = await apiClient.put<Category>(`/categories/${id}`, { name });
    replaceCachedCategory(response.data);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
    if (categoryCache) {
      categoryCache = categoryCache.filter((category) => category.id !== id);
    }
  },
};
