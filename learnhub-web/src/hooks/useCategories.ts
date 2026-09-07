import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query/queryKeys';
import { categoryService } from '../services/api/category.service';
import { getApiErrorMessage } from '../utils';

export function useCategories(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => categoryService.getAll(signal),
    enabled,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });

  return {
    categories: query.data ?? [],
    loading: enabled && query.isPending,
    error: query.error
      ? getApiErrorMessage(query.error, 'Không tải được danh sách danh mục.')
      : null,
  };
}
