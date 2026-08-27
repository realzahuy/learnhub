import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConfirmDialog, LoadingScreen } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { categoryService } from '../../services/api/category.service';
import { Category } from '../../types/course.types';
import { getApiErrorMessage } from '../../utils';
import './AdminCategoriesPage.css';

const NAME_MAX_LENGTH = 100;

const AdminCategoriesPage: React.FC = () => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    categoryService
      .getAll()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err, 'Không tải được danh sách danh mục.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.select();
  }, [editingId]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name || creating) return;

      setCreating(true);
      try {
        const created = await categoryService.create(name);

        setCategories((prev) => [...prev, created]);
        setNewName('');
        showToast(`Đã thêm danh mục "${created.name}"`, 'success');
      } catch (err) {
        showToast(getApiErrorMessage(err, 'Không thêm được danh mục.'), 'error');
      } finally {
        setCreating(false);
      }
    },
    [newName, creating, showToast]
  );

  const startEdit = useCallback((category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName('');
  }, []);

  const handleRename = useCallback(async () => {
    if (editingId === null) return;

    const name = editingName.trim();
    const current = categories.find((category) => category.id === editingId);

    if (!name || name === current?.name) {
      cancelEdit();
      return;
    }

    setSavingId(editingId);
    try {
      const updated = await categoryService.update(editingId, name);
      setCategories((prev) =>
        prev.map((category) => (category.id === updated.id ? updated : category))
      );
      cancelEdit();
      showToast('Đã đổi tên danh mục', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không đổi được tên danh mục.'), 'error');
    } finally {
      setSavingId(null);
    }
  }, [editingId, editingName, categories, cancelEdit, showToast]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await categoryService.remove(pendingDelete.id);
      setCategories((prev) => prev.filter((category) => category.id !== pendingDelete.id));
      showToast(`Đã xóa danh mục "${pendingDelete.name}"`, 'success');
      setPendingDelete(null);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không xóa được danh mục.'), 'error');
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, showToast]);

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
          <ul className="admin-category-list motion-stagger">
            {categories.map((category) => {
              const isEditing = editingId === category.id;
              const isSaving = savingId === category.id;

              return (
                <li key={category.id} className="admin-category-row">
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      className="admin-category-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}

                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRename();
                        } else if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      maxLength={NAME_MAX_LENGTH}
                      disabled={isSaving}
                      aria-label={`Tên danh mục ${category.name}`}
                    />
                  ) : (
                    <span className="admin-category-name">{category.name}</span>
                  )}

                  <div className="admin-category-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn-admin-icon btn-admin-icon-confirm"
                          onClick={handleRename}
                          disabled={isSaving}
                          title="Lưu"
                          aria-label={`Lưu tên danh mục ${category.name}`}
                        >
                          <i className="bi bi-check-lg"></i>
                        </button>
                        <button
                          type="button"
                          className="btn-admin-icon"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          title="Hủy"
                          aria-label="Hủy đổi tên"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-admin-icon"
                          onClick={() => startEdit(category)}
                          title="Đổi tên"
                          aria-label={`Đổi tên danh mục ${category.name}`}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          type="button"
                          className="btn-admin-icon btn-admin-icon-danger"
                          onClick={() => setPendingDelete(category)}
                          title="Xóa"
                          aria-label={`Xóa danh mục ${category.name}`}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
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
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
    </>
  );
};

export default AdminCategoriesPage;
