import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dropdown, DropdownOption, Pagination, LoadingScreen, UserAvatar } from '../../components/common';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { adminService } from '../../services/api/admin.service';
import { AdminUser, AdminUserFilter } from '../../types/admin.types';
import { PageResponse } from '../../types/pagination.types';
import { formatLongDate, formatDateTime } from '../../utils';
import './AdminUsersPage.css';

const USER_FILTER_OPTIONS: DropdownOption[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'INSTRUCTOR', label: 'Giảng viên' },
];

const ROLE_LABELS: Record<string, string> = {
  ROLE_USER: 'Học viên',
  ROLE_INSTRUCTOR: 'Giảng viên',
  ROLE_ADMIN: 'Quản trị viên',
};

const formatRoles = (roles: string[]) =>
  roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');

const AdminUsersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const filterParam = searchParams.get('filter');
  const userFilter: AdminUserFilter = filterParam === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'ALL';
  const currentPage = parseInt(searchParams.get('page') || '0');

  const [pageData, setPageData] = useState<PageResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.set('page', '0');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const [pushSearchToUrl] = useDebouncedCallback(
    (value: string) => setParam('search', value.trim()),
    500
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      pushSearchToUrl(value);
    },
    [pushSearchToUrl]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.listUsers({
          filter: userFilter,
          search: searchQuery || undefined,
          page: currentPage,
        });
        if (!cancelled) setPageData(data);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải danh sách người dùng:', err);
        setError('Không thể tải danh sách người dùng. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, userFilter, currentPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      setParam('page', page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setParam]
  );

  const users = pageData?.content ?? [];

  return (
    <>
      <div className="admin-users">
        <div className="admin-toolbar">
          { }
          <Dropdown
            className="admin-dropdown"
            value={userFilter}
            options={USER_FILTER_OPTIONS}
            onChange={(value) => setParam('filter', value === 'ALL' ? '' : value)}
            ariaLabel="Lọc người dùng theo vai trò"
          />
          <div className="admin-instructor-total">
            {pageData
              ? `${pageData.totalElements} ${userFilter === 'INSTRUCTOR' ? 'giảng viên' : 'người dùng'}`
              : ' '}
          </div>
          <div className="admin-search">
            <input
              type="text"
              placeholder="Tìm theo tên, tài khoản, email..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Tìm kiếm người dùng"
            />
            <i className="bi bi-search"></i>
          </div>
        </div>

        {loading ? (
          <LoadingScreen />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            {searchQuery
              ? 'Không tìm thấy người dùng nào phù hợp.'
              : userFilter === 'INSTRUCTOR'
                ? 'Chưa có giảng viên nào.'
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
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      { }
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
                  <dt>Ngày tham gia</dt>
                  <dd>{formatLongDate(detailUser.createdAt) ?? '—'}</dd>
                  <dt>Đăng nhập lần cuối</dt>
                  <dd>{formatDateTime(detailUser.lastLogin) ?? 'Chưa từng đăng nhập'}</dd>
                </dl>

                {detailUser.roles.includes('ROLE_INSTRUCTOR') && <div className="admin-detail-section">
                  <h6>Khóa học</h6>
                  {

}
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
    </>
  );
};

export default AdminUsersPage;
