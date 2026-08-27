import { useCallback, useEffect, useState } from 'react';
import { categoryService } from '../services/api/category.service';
import { Category } from '../types/course.types';
import { getApiErrorMessage } from '../utils';

export function useCategories(enabled = true) {
  const cached = categoryService.getCached();
  const [categories, setCategories] = useState<Category[]>(cached ?? []);
  const [loading, setLoading] = useState(enabled && cached === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(categoryService.getCached() === null);
    setError(null);
    try {
      setCategories(await categoryService.getAll());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không tải được danh sách danh mục.'));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  return { categories, loading, error };
}
