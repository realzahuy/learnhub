import { useQuery } from '@tanstack/react-query';
import { uiConfig } from '../config/uiConfig';
import { queryKeys } from '../query/queryKeys';
import { categoryService } from '../services/api/category.service';
import { getApiErrorMessage } from '../utils';

export function useCategories(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => categoryService.getAll(signal),
    enabled,
    staleTime: uiConfig.query.categoriesStaleMs,
    gcTime: uiConfig.query.categoriesGcMs,
  });

  return {
    categories: query.data ?? [],
    loading: enabled && query.isPending,
    error: query.error
      ? getApiErrorMessage(query.error, 'Không tải được danh sách danh mục.')
      : null,
  };
}
