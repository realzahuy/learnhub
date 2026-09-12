import { UserAvatar } from '../../components/common';
import { AdminUser } from '../../types/admin.types';
import { formatLongDate } from '../../utils';
import { formatRoles } from './adminUserFormat';

interface AdminUserTableProps {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
}

const AdminUserTable = ({ users, onSelect }: AdminUserTableProps) => (
  <div className="admin-table-wrap">
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
        {users.map((user) => (
          <tr
            key={user.id}
            className="admin-table-row"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(user)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(user);
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
        ))}
      </tbody>
    </table>
  </div>
);

export default AdminUserTable;
