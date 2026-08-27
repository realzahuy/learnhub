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
  LoadingScreen,
  UserAvatar,
} from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { usePagedSearchParams } from '../../hooks/usePagedSearchParams';
import { queryKeys } from '../../query/queryKeys';
import { adminService } from '../../services/api/admin.service';
import { AdminUser, AdminUserFilter } from '../../types/admin.types';
import { PageResponse } from '../../types/pagination.types';
import { formatLongDate, formatDateTime, getApiErrorMessage } from '../../utils';
import './AdminUsersPage.css';

const USER_FILTER_OPTIONS: DropdownOption[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'INSTRUCTOR', label: 'Giảng viên' },
  { value: 'LOCKED', label: 'Đã khóa' },
];

const ROLE_LABELS: Record<string, string> = {
  ROLE_USER: 'Học viên',
  ROLE_INSTRUCTOR: 'Giảng viên',
  ROLE_ADMIN: 'Quản trị viên',
};

const formatRoles = (roles: string[]) =>
  roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');

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
        <div
          className={`motion-loading-region${loading && pageData ? ' is-updating' : ''}`}
          aria-busy={loading}
        >
          {loading && !pageData ? (
            <LoadingScreen variant="table" count={6} />
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
            <div className="admin-table-wrap motion-content-enter">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tham gia</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    return (

                    <tr
                      key={user.id}
                      className="admin-table-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailUser(user)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailUser(user);
                        }
                      }}
                      title="Bấm để xem chi tiết"
                    >
                      <td>
                        <div className="admin-instructor-cell">
                          <UserAvatar
                            avatar={user.avatar}
                            fullName={user.fullName}
                            size="md"
                          />
                          <div className="admin-instructor-identity">
                            <span className="admin-instructor-name">{user.fullName}</span>
                            <span className="admin-instructor-username">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-instructor-email">
                          <span>{user.email}</span>
                          {user.emailVerified ? (
                            <i
                              className="bi bi-patch-check-fill admin-verified"
                              title="Email đã xác thực"
                              aria-label="Email đã xác thực"
                            ></i>
                          ) : (
                            <i
                              className="bi bi-exclamation-circle admin-unverified"
                              title="Email chưa xác thực"
                              aria-label="Email chưa xác thực"
                            ></i>
                          )}
                        </div>
                      </td>
                      <td>{formatRoles(user.roles) || '—'}</td>
                      <td>
                        <span
                          className={`admin-account-status admin-account-status-${user.accountStatus.toLowerCase()}`}
                        >
                          {user.accountStatus === 'LOCKED' ? 'Đã khóa' : 'Hoạt động'}
                        </span>
                      </td>
                      <td className="admin-instructor-date">
                        {formatLongDate(user.createdAt) ?? '—'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
        <div
          className="modal show d-block admin-detail-modal"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailUser(null);
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title mb-0">Chi tiết người dùng</h5>
              </div>

              <div className="modal-body">
                <div className="admin-detail-headline">
                  <UserAvatar
                    avatar={detailUser.avatar}
                    fullName={detailUser.fullName}
                    size="lg"
                  />
                  <div>
                    <h3 className="admin-detail-title">{detailUser.fullName}</h3>
                    <span className="admin-instructor-username">
                      @{detailUser.username}
                    </span>
                  </div>
                </div>

                <dl className="admin-detail-fields">
                  <dt>Email</dt>
                  <dd>
                    <div className="admin-instructor-email">
                      <span>{detailUser.email}</span>
                      <span
                        className={
                          detailUser.emailVerified
                            ? 'admin-instructor-badge admin-instructor-badge-ok'
                            : 'admin-instructor-badge admin-instructor-badge-warn'
                        }
                      >
                        {detailUser.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                      </span>
                    </div>
                  </dd>
                  <dt>Vai trò</dt>
                  <dd>{formatRoles(detailUser.roles) || '—'}</dd>
                  <dt>Trạng thái tài khoản</dt>
                  <dd>
                    <span
                      className={`admin-account-status admin-account-status-${detailUser.accountStatus.toLowerCase()}`}
                    >
                      {detailUser.accountStatus === 'LOCKED' ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </dd>
                  <dt>Ngày tham gia</dt>
                  <dd>{formatLongDate(detailUser.createdAt) ?? '—'}</dd>
                  <dt>Đăng nhập lần cuối</dt>
                  <dd>{formatDateTime(detailUser.lastLogin) ?? 'Chưa từng đăng nhập'}</dd>
                </dl>

                {detailUser.roles.includes('ROLE_INSTRUCTOR') && <div className="admin-detail-section">
                  <h6>Khóa học</h6>
                  <div className="admin-instructor-courses">
                    <div className="admin-instructor-headline-item">
                      <span className="admin-instructor-headline-value">
                        {detailUser.publishedCourses}
                      </span>
                      <span className="admin-instructor-headline-label">Đã xuất bản</span>
                    </div>
                    <div className="admin-instructor-headline-item">
                      <span className="admin-instructor-headline-value">
                        {detailUser.totalStudents}
                      </span>
                      <span className="admin-instructor-headline-label">Học viên</span>
                    </div>
                  </div>
                </div>}

                <div className="admin-detail-section">
                  <h6>Giới thiệu</h6>
                  {detailUser.bio ? (
                    <p className="admin-detail-desc">{detailUser.bio}</p>
                  ) : (
                    <p className="admin-instructor-muted">Người dùng chưa viết giới thiệu.</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                {!detailUser.roles.includes('ROLE_ADMIN') && detailUser.accountStatus === 'ACTIVE' && (
                  <button
                    type="button"
                    className="btn-admin-danger"
                    onClick={() => setPendingLock(detailUser)}
                  >
                    Khóa tài khoản
                  </button>
                )}
                {!detailUser.roles.includes('ROLE_ADMIN') && detailUser.accountStatus === 'LOCKED' && (
                  <button
                    type="button"
                    className="btn-admin-approve"
                    onClick={() => setPendingUnlock(detailUser)}
                  >
                    Mở khóa tài khoản
                  </button>
                )}
                <button
                  type="button"
                  className="btn-admin-neutral"
                  onClick={() => setDetailUser(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingLock !== null}
        title={`Khóa tài khoản @${pendingLock?.username}?`}
        message="Người dùng sẽ bị đăng xuất khỏi tất cả thiết bị và không thể đăng nhập. Hệ thống sẽ gửi email thông báo kèm địa chỉ email liên hệ của bạn."
        confirmLabel={locking ? 'Đang khóa...' : 'Khóa tài khoản'}
        cancelLabel="Hủy"
        variant="danger"
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
        onConfirm={handleUnlockUser}
        onCancel={() => {
          if (!unlocking) setPendingUnlock(null);
        }}
      />
    </>
  );
};

export default AdminUsersPage;
