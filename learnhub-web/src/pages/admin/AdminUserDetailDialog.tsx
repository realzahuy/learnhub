import { createPortal } from 'react-dom';
import { UserAvatar } from '../../components/common';
import { AdminUser } from '../../types/admin.types';
import { formatLongDate, formatDateTime } from '../../utils';
import { formatRoles } from './adminUserFormat';

interface AdminUserDetailDialogProps {
  user: AdminUser;
  onClose: () => void;
  onLock: (user: AdminUser) => void;
  onUnlock: (user: AdminUser) => void;
}

const AdminUserDetailDialog = ({ user: detailUser, onClose, onLock, onUnlock }: AdminUserDetailDialogProps) => {
  return createPortal(
    <div
      className="modal show d-block admin-detail-modal"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                onClick={() => onLock(detailUser)}
              >
                Khóa tài khoản
              </button>
            )}
            {!detailUser.roles.includes('ROLE_ADMIN') && detailUser.accountStatus === 'LOCKED' && (
              <button
                type="button"
                className="btn-admin-approve"
                onClick={() => onUnlock(detailUser)}
              >
                Mở khóa tài khoản
              </button>
            )}
            <button
              type="button"
              className="btn-admin-neutral"
              onClick={() => onClose()}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminUserDetailDialog;
