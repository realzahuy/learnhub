import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar, ConfirmDialog } from '../../common';
import EmailVerificationPanel from './EmailVerificationPanel';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { authService } from '../../../services/api/auth.service';
import { userService } from '../../../services/api/user.service';
import { User, ROLE_INSTRUCTOR } from '../../../types/auth.types';
import {
  ALLOWED_IMAGE_TYPES,
  formatDateTime,
  getApiErrorMessage,
  validateImageFile,
} from '../../../utils';
import './ProfileEditor.css';
import { ROUTE_PATHS } from '../../../routes/paths';

interface ProfileForm {
  fullName: string;
  bio: string;
}

const toForm = (user: User): ProfileForm => ({
  fullName: user.fullName ?? '',
  bio: user.bio ?? '',
});

interface EditButtonProps {
  label: string;
  isEditing: boolean;
  onClick: () => void;
}

const EditButton: React.FC<EditButtonProps> = ({ label, isEditing, onClick }) => (
  <button
    type="button"
    className={`profile-edit-btn ${isEditing ? 'is-editing' : ''}`}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-pencil'}`}></i>
  </button>
);

interface ProfileEditorProps {

  showInstructorUpgrade?: boolean;

  changePasswordPath?: string;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  showInstructorUpgrade = false,
  changePasswordPath = ROUTE_PATHS.profileChangePassword,
}) => {
  const { user: cachedUser, isAuthenticated, updateUser, roles, syncRoles } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(cachedUser);
  const [form, setForm] = useState<ProfileForm>(
    cachedUser ? toForm(cachedUser) : { fullName: '', bio: '' }
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'fullName' | null>(null);

  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [isUpgradeConfirmOpen, setIsUpgradeConfirmOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isLogoutOthersConfirmOpen, setIsLogoutOthersConfirmOpen] = useState(false);
  const [isLoggingOutOthers, setIsLoggingOutOthers] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirtyRef = useRef(false);

  const handleFieldChange = useCallback((field: keyof ProfileForm, value: string) => {
    isDirtyRef.current = true;
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePickAvatar = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      e.target.value = '';
      if (!file) return;

      const invalidReason = validateImageFile(file);
      if (invalidReason) {
        showToast(invalidReason, 'error');
        return;
      }

      isDirtyRef.current = true;
      setPendingAvatar(file);
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setIsRefreshing(true);
        setError(null);
        const fresh = await authService.getCurrentUser();
        if (cancelled) return;
        setProfile(fresh);
        if (!isDirtyRef.current) {
          setForm(toForm(fresh));
        }
        updateUser(fresh);
      } catch (err) {
        if (cancelled) return;
        console.error('Không thể tải hồ sơ:', err);
        setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };

  }, [isAuthenticated]);

  const handleSave = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setEditingField(null);
      setIsSaving(true);

      try {
        const updated = await userService.updateProfile({
          fullName: form.fullName.trim(),
          bio: form.bio,
          avatar: pendingAvatar,
        });

        setProfile(updated);
        setForm(toForm(updated));
        updateUser(updated);

        isDirtyRef.current = false;
        setPendingAvatar(null);
        setAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        showToast('Đã lưu thông tin cá nhân', 'success');
      } catch (err) {
        console.error('Không thể cập nhật hồ sơ:', err);
        showToast(getApiErrorMessage(err, 'Không thể lưu thông tin. Vui lòng thử lại sau.'), 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [form, pendingAvatar, updateUser, showToast]
  );

  const handleUpgradeToInstructor = useCallback(async () => {
    setIsUpgradeConfirmOpen(false);
    setIsUpgrading(true);

    try {
      await userService.upgradeToInstructor();

      await authService.refreshTokens();
      syncRoles();
      showToast('Đã nâng cấp lên tài khoản giảng viên', 'success');
    } catch (err) {
      console.error('Không thể nâng cấp tài khoản giảng viên:', err);
      showToast(getApiErrorMessage(err, 'Không thể nâng cấp tài khoản. Vui lòng thử lại sau.'), 'error');
    } finally {
      setIsUpgrading(false);
    }
  }, [syncRoles, showToast]);

  const handleLogoutOtherDevices = useCallback(async () => {
    setIsLogoutOthersConfirmOpen(false);
    setIsLoggingOutOthers(true);
    try {
      const count = await authService.logoutOtherDevices();
      showToast(
        count > 0
          ? `Đã đăng xuất ${count} phiên trên thiết bị khác`
          : 'Không có thiết bị nào khác đang đăng nhập',
        'success'
      );
    } catch (err) {
      console.error('Không thể đăng xuất các thiết bị khác:', err);
      showToast(
        getApiErrorMessage(err, 'Không thể đăng xuất các thiết bị khác. Vui lòng thử lại sau.'),
        'error'
      );
    } finally {
      setIsLoggingOutOthers(false);
    }
  }, [showToast]);

  const isInstructor = roles.includes(ROLE_INSTRUCTOR);
  const lastLogin = profile ? formatDateTime(profile.lastLogin) : null;
  const isDirty =
    !!profile &&
    (form.fullName !== (profile.fullName ?? '') ||
      form.bio !== (profile.bio ?? '') ||
      pendingAvatar !== null);

  return (
    <>
      {
}
      {isRefreshing && (
        <div className="d-flex align-items-center mb-3">
          <span className="spinner-border spinner-border-sm text-notion" role="status">
            <span className="visually-hidden">Đang làm mới...</span>
          </span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!profile ? (
        <div className="text-center py-5">
          <div className="spinner-border text-notion" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          { }
          <div className="profile-card mb-4">
            <div className="row g-4">
              <div className="col-lg-3">
                <div className="profile-avatar-col">
                  <div className="profile-avatar-wrap">
                    <UserAvatar
                      avatar={avatarPreview ?? profile.avatar}
                      fullName={profile.fullName}
                      size="xl"
                      className="profile-avatar"
                    />
                    <button
                      type="button"
                      className="profile-avatar-edit"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      aria-label="Đổi ảnh đại diện"
                      title="Đổi ảnh đại diện"
                    >
                      <i className="bi bi-camera-fill"></i>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="d-none"
                      accept={ALLOWED_IMAGE_TYPES.join(',')}
                      onChange={handlePickAvatar}
                    />
                  </div>
                  <p className="profile-username mb-0">@{profile.username}</p>

                  {
}
                  {showInstructorUpgrade &&
                    (isInstructor ? (
                      <span className="profile-role-badge">
                        <i className="bi bi-mortarboard-fill"></i>
                        Giảng viên
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-profile-upgrade"
                        onClick={() => setIsUpgradeConfirmOpen(true)}
                        disabled={isUpgrading}
                      >
                        {isUpgrading ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Đang nâng cấp...
                          </>
                        ) : (
                          'Nâng cấp tài khoản giảng viên'
                        )}
                      </button>
                    ))}

                  {pendingAvatar && (
                    <p className="profile-avatar-hint mb-0">Ảnh mới, bấm Lưu thông tin để áp dụng</p>
                  )}
                </div>
              </div>

              {
}
              <div className="col-lg-9">
                <div className="profile-details">
                  <h2 className="profile-section-title">Thông tin cá nhân</h2>

                  <div className="profile-field-label">Họ và tên:</div>
                  <div className="profile-field-value">
                    {editingField === 'fullName' ? (
                      <input
                        type="text"
                        className="profile-inline-input"
                        value={form.fullName}
                        onChange={(e) => handleFieldChange('fullName', e.target.value)}
                        aria-label="Họ và tên"
                        autoFocus
                      />
                    ) : (
                      <span>{form.fullName}</span>
                    )}
                    <EditButton
                      label="Sửa họ và tên"
                      isEditing={editingField === 'fullName'}
                      onClick={() =>
                        setEditingField((prev) => (prev === 'fullName' ? null : 'fullName'))
                      }
                    />
                  </div>

                  {
}
                  <div className="profile-field-label">Email:</div>
                  <div className="profile-field-value">
                    <span>{profile.email}</span>
                    {profile.emailVerified ? (
                      <span className="profile-status profile-status-verified">
                        <i className="bi bi-patch-check-fill"></i>
                        Email đã xác thực
                      </span>
                    ) : (
                      <EmailVerificationPanel

                        onVerified={() =>
                          setProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev))
                        }
                      />
                    )}
                  </div>

                  <h2 className="profile-section-title">Bảo mật</h2>

                  <div className="profile-field-label">Đăng nhập lần cuối:</div>
                  <div className="profile-field-value">
                    {lastLogin ?? <span className="profile-empty">Chưa có</span>}
                  </div>

                  <div className="profile-details-action profile-security-actions">
                    <button
                      type="button"
                      className="btn-profile-outline"
                      onClick={() => navigate(changePasswordPath)}
                    >
                      <i className="bi bi-lock me-2" aria-hidden="true"></i>
                      Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      className="btn-profile-outline btn-profile-outline-danger"
                      onClick={() => setIsLogoutOthersConfirmOpen(true)}
                      disabled={isLoggingOutOthers}
                    >
                      <i className="bi bi-display me-2" aria-hidden="true"></i>
                      {isLoggingOutOthers ? 'Đang đăng xuất...' : 'Đăng xuất thiết bị khác'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          { }
          <section className="profile-card mb-4">
            <h2 className="profile-section-title">Giới thiệu</h2>
            <textarea
              className="profile-bio-input"
              placeholder="Chưa có giới thiệu"
              value={form.bio}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
              aria-label="Giới thiệu"
              rows={7}
            />
          </section>

          <div className="text-center">
            <button type="submit" className="btn-profile-primary" disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang lưu...
                </>
              ) : (
                'Lưu thông tin'
              )}
            </button>
          </div>
        </form>
      )}

      {showInstructorUpgrade && (
        <ConfirmDialog
          isOpen={isUpgradeConfirmOpen}
          title="Nâng cấp tài khoản giảng viên"
          message="Sau khi nâng cấp, bạn có thể tạo và quản lý khóa học của riêng mình. Tài khoản cần đã xác thực email."
          confirmLabel="Nâng cấp"
          variant="primary"
          onConfirm={handleUpgradeToInstructor}
          onCancel={() => setIsUpgradeConfirmOpen(false)}
        />
      )}

      <ConfirmDialog
        isOpen={isLogoutOthersConfirmOpen}
        title="Đăng xuất khỏi các thiết bị khác"
        message="Phiên trên thiết bị hiện tại vẫn được giữ. Tất cả trình duyệt và thiết bị khác sẽ phải đăng nhập lại."
        confirmLabel="Đăng xuất thiết bị khác"
        variant="danger"
        onConfirm={handleLogoutOtherDevices}
        onCancel={() => setIsLogoutOthersConfirmOpen(false)}
      />
    </>
  );
};

export default ProfileEditor;
