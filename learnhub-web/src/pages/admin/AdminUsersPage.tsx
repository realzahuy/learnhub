import React, { useCallback, useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ConfirmDialog,
  Dropdown,
  DropdownOption,
  Pagination,
  PageSkeleton,
} from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { queryKeys } from '../../query/queryKeys';
import { adminService } from '../../services/api/admin.service';
import { AdminUser, AdminUserFilter } from '../../types/admin.types';
import { PageResponse } from '../../types/pagination.types';
import { getApiErrorMessage } from '../../utils';
import AdminUserTable from './AdminUserTable';
import AdminUserDetailDialog from './AdminUserDetailDialog';
import './AdminUsersPage.css';

const USER_FILTER_OPTIONS: DropdownOption[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'INSTRUCTOR', label: 'Giảng viên' },
  { value: 'LOCKED', label: 'Đã khóa' },
];

const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast();
  const {
    page: currentPage,
    search: searchQuery,
    searchInput: localSearch,
    setPage,
    setParam,
    setSearch,
    searchParams,
  } = usePagedSearchParams();

  const filterParam = searchParams.get('filter');
  const userFilter: AdminUserFilter =
    filterParam === 'INSTRUCTOR' || filterParam === 'LOCKED' ? filterParam : 'ALL';
  const queryClient = useQueryClient();
  const userFilters = useMemo(
    () => ({
      page: currentPage,
      filter: userFilter,
      search: searchQuery || undefined,
    }),
    [currentPage, searchQuery, userFilter]
  );
  const userQueryKey = useMemo(
    () => queryKeys.adminUsers.list(userFilters),
    [userFilters]
  );
  const userQuery = useQuery({
    queryKey: userQueryKey,
    queryFn: ({ signal }) => adminService.listUsers(userFilters, signal),
    placeholderData: keepPreviousData,
  });
  const pageData = userQuery.data ?? null;
  const loading = userQuery.isFetching;
  const error = userQuery.error
    ? 'Không thể tải danh sách người dùng. Vui lòng thử lại sau.'
    : null;

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [pendingLock, setPendingLock] = useState<AdminUser | null>(null);
  const [pendingUnlock, setPendingUnlock] = useState<AdminUser | null>(null);
  const lockMutation = useMutation({ mutationFn: adminService.lockUser });
  const unlockMutation = useMutation({ mutationFn: adminService.unlockUser });
  const locking = lockMutation.isPending;
  const unlocking = unlockMutation.isPending;

  const handleLockUser = useCallback(async () => {
    if (!pendingLock || locking) return;

    try {
      await lockMutation.mutateAsync(pendingLock.id);
      const lockedUser = { ...pendingLock, accountStatus: 'LOCKED' as const };
      queryClient.setQueryData<PageResponse<AdminUser>>(userQueryKey, (current) =>
        current
          ? {
              ...current,
              content: current.content.map((user) =>
                user.id === lockedUser.id ? lockedUser : user
              ),
            }
          : current
      );
      setDetailUser((current) =>
        current?.id === lockedUser.id ? lockedUser : current
      );
      setPendingLock(null);
      showToast(
        `Đã khóa tài khoản @${lockedUser.username}. Email thông báo đang được gửi.`,
        'success'
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể khóa tài khoản. Vui lòng thử lại.'), 'error');
    }
  }, [lockMutation, locking, pendingLock, queryClient, showToast, userQueryKey]);

  const handleUnlockUser = useCallback(async () => {
    if (!pendingUnlock || unlocking) return;

    try {
      await unlockMutation.mutateAsync(pendingUnlock.id);
      const activeUser = { ...pendingUnlock, accountStatus: 'ACTIVE' as const };
      queryClient.setQueryData<PageResponse<AdminUser>>(userQueryKey, (current) => {
        if (!current) return current;
        if (userFilter !== 'LOCKED') {
          return {
            ...current,
            content: current.content.map((user) =>
              user.id === activeUser.id ? activeUser : user
            ),
          };
        }

        const totalElements = Math.max(0, current.totalElements - 1);
        const totalPages = Math.ceil(totalElements / current.pageSize);
        return {
          ...current,
          content: current.content.filter((user) => user.id !== activeUser.id),
          totalElements,
          totalPages,
          last: current.pageNumber >= totalPages - 1,
        };
      });
      setDetailUser((current) =>
        current?.id === activeUser.id ? activeUser : current
      );
      setPendingUnlock(null);
      showToast(`Đã mở khóa tài khoản @${activeUser.username}.`, 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    } catch (err) {
      showToast(
        getApiErrorMessage(err, 'Không thể mở khóa tài khoản. Vui lòng thử lại.'),
        'error'
      );
    }
  }, [
    pendingUnlock,
    queryClient,
    showToast,
    unlockMutation,
    unlocking,
    userFilter,
    userQueryKey,
  ]);

  const users = pageData?.content ?? [];

  return (
    <>
      <div className="admin-users">
        <div className="admin-toolbar">
          <Dropdown
            className="admin-dropdown"
            value={userFilter}
            options={USER_FILTER_OPTIONS}
            onChange={(value) => setParam('filter', value === 'ALL' ? '' : value)}
            ariaLabel="Lọc người dùng theo vai trò"
          />
          <div className="admin-instructor-total">
            {pageData
              ? `${pageData.totalElements} ${
                  userFilter === 'INSTRUCTOR'
                    ? 'giảng viên'
                    : userFilter === 'LOCKED'
                      ? 'tài khoản bị khóa'
                      : 'người dùng'
                }`
              : ' '}
          </div>
          <div className="admin-search">
            <input
              type="text"
              placeholder="Tìm theo tên, tài khoản, email..."
              value={localSearch}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm người dùng"
            />
            <i className="bi bi-search"></i>
          </div>
        </div>

        {error && pageData && <div className="alert alert-danger">{error}</div>}
        <div className="list-loading-status" role="status">
          {loading && pageData ? 'Đang cập nhật…' : ''}
        </div>
        <div
          className="motion-loading-region"
          aria-busy={loading}
        >
          {loading && !pageData ? (
            <PageSkeleton variant="table" count={6} />
          ) : error && !pageData ? (
            <div className="alert alert-danger">{error}</div>
          ) : users.length === 0 ? (
            <div className="admin-empty">
              {searchQuery
                ? 'Không tìm thấy người dùng nào phù hợp.'
                : userFilter === 'INSTRUCTOR'
                  ? 'Chưa có giảng viên nào.'
                  : userFilter === 'LOCKED'
                    ? 'Chưa có tài khoản nào bị khóa.'
                    : 'Chưa có người dùng nào.'}
            </div>
          ) : (
            <>
            <AdminUserTable users={users} onSelect={setDetailUser} />

            {pageData && (
              <Pagination
                currentPage={currentPage}
                totalPages={pageData.totalPages}
                isFirst={pageData.first}
                isLast={pageData.last}
                onPageChange={setPage}
              />
            )}
            </>
          )}
        </div>
      </div>

      {detailUser && (
        <AdminUserDetailDialog
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onLock={setPendingLock}
          onUnlock={setPendingUnlock}
        />
      )}

      <ConfirmDialog
        isOpen={pendingLock !== null}
        title={`Khóa tài khoản @${pendingLock?.username}?`}
        message="Người dùng sẽ bị đăng xuất khỏi tất cả thiết bị và không thể đăng nhập. Hệ thống sẽ gửi email thông báo kèm địa chỉ email liên hệ của bạn."
        confirmLabel={locking ? 'Đang khóa...' : 'Khóa tài khoản'}
        cancelLabel="Hủy"
        variant="danger"
        pending={locking}
        onConfirm={handleLockUser}
        onCancel={() => {
          if (!locking) setPendingLock(null);
        }}
      />

      <ConfirmDialog
        isOpen={pendingUnlock !== null}
        title={`Mở khóa tài khoản @${pendingUnlock?.username}?`}
        message="Người dùng sẽ có thể đăng nhập lại vào tài khoản này."
        confirmLabel={unlocking ? 'Đang mở khóa...' : 'Mở khóa tài khoản'}
        cancelLabel="Hủy"
        variant="primary"
        pending={unlocking}
        onConfirm={handleUnlockUser}
        onCancel={() => {
          if (!unlocking) setPendingUnlock(null);
        }}
      />
    </>
  );
};

export default AdminUsersPage;
