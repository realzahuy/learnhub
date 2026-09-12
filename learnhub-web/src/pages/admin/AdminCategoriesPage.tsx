import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog, LoadingScreen } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { useCategories } from '../../hooks/useCategories';
import { queryKeys } from '../../query/queryKeys';
import { categoryService } from '../../services/api/category.service';
import { Category } from '../../types/course.types';
import { getApiErrorMessage } from '../../utils';
import './AdminCategoriesPage.css';

const NAME_MAX_LENGTH = 100;

const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { categories, loading, error } = useCategories();

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name || creating) return;

      setCreating(true);
      try {
        const created = await categoryService.create(name);
        await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });
        queryClient.setQueryData<Category[]>(queryKeys.categories.all, (current = []) => [
          ...current,
          created,
        ]);
        void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
        setNewName('');
        showToast(`Đã thêm danh mục "${created.name}"`, 'success');
      } catch (err) {
        showToast(getApiErrorMessage(err, 'Không thêm được danh mục.'), 'error');
      } finally {
        setCreating(false);
      }
    },
    [newName, creating, queryClient, showToast]
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    try {
      await categoryService.remove(pendingDelete.id);
      await queryClient.cancelQueries({ queryKey: queryKeys.categories.all });
      queryClient.setQueryData<Category[]>(queryKeys.categories.all, (current = []) =>
        current.filter((category) => category.id !== pendingDelete.id)
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      showToast(`Đã xóa danh mục "${pendingDelete.name}"`, 'success');
      setPendingDelete(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không xóa được danh mục.'), 'error');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }, [deleting, pendingDelete, queryClient, showToast]);

  return (
    <>
      <div className="admin-categories">
        <form className="admin-category-create" onSubmit={handleCreate}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên danh mục mới..."
            maxLength={NAME_MAX_LENGTH}
            aria-label="Tên danh mục mới"
          />
          <button type="submit" className="btn-admin-primary" disabled={!newName.trim() || creating}>
            <i className="bi bi-plus-lg"></i>
            {creating ? 'Đang thêm...' : 'Thêm danh mục'}
          </button>
        </form>

        {loading ? (
          <LoadingScreen variant="list" count={6} />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : categories.length === 0 ? (
          <div className="admin-category-empty">
            <i className="bi bi-tags"></i>
            <p className="mb-0">Chưa có danh mục nào. Thêm danh mục đầu tiên ở ô phía trên.</p>
          </div>
        ) : (
          <ul className="admin-category-list">
            {categories.map((category) => (
              <li key={category.id} className="admin-category-row">
                <span className="admin-category-name">{category.name}</span>

                <div className="admin-category-actions">
                  <button
                    type="button"
                    className="btn-admin-icon btn-admin-icon-danger"
                    onClick={() => setPendingDelete(category)}
                    title="Xóa"
                    aria-label={`Xóa danh mục ${category.name}`}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={`Xóa danh mục "${pendingDelete?.name}"?`}
        message="Chỉ xóa được khi không còn khóa học nào thuộc danh mục này."
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa danh mục'}
        cancelLabel="Giữ lại"
        variant="danger"
        pending={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </>
  );
};

export default AdminCategoriesPage;
