import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { authService } from '../../../services/api/auth.service';
import { getAuthGeneration } from '../../../services/api/tokenStore';
import { userService } from '../../../services/api/user.service';
import { User } from '../../../types/auth.types';
import { getApiErrorMessage, validateImageFile } from '../../../utils';
import { queryClient } from '../../../query/queryClient';
import { queryKeys } from '../../../query/queryKeys';

interface ProfileForm {
  fullName: string;
  bio: string;
}

const toForm = (user: User): ProfileForm => ({
  fullName: user.fullName ?? '',
  bio: user.bio ?? '',
});

export const useProfileForm = () => {
  const { user: cachedUser, userId, updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileForm>(
    cachedUser ? { fullName: cachedUser.fullName, bio: '' } : { fullName: '', bio: '' }
  );
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'fullName' | null>(null);

  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDirtyRef = useRef(false);
  const activeUserIdRef = useRef(userId);
  activeUserIdRef.current = userId;

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
    isDirtyRef.current = false;
    setProfile(null);
    setForm({ fullName: '', bio: '' });
    setEditingField(null);
    setPendingAvatar(null);
    setIsSaving(false);
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (userId === null) return;

    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setError(null);
        const fresh = await authService.getCurrentUser(controller.signal);
        if (controller.signal.aborted) return;
        setProfile(fresh);
        if (!isDirtyRef.current) {
          setForm(toForm(fresh));
        }
        updateUser(fresh);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError('Không thể tải thông tin cá nhân. Vui lòng thử lại sau.');
      }
    };

    fetchProfile();

    return () => controller.abort();

  }, [userId]);

  const handleSave = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const requestUserId = userId;
      if (requestUserId === null) return;
      const requestGeneration = getAuthGeneration();
      setEditingField(null);
      setIsSaving(true);

      try {
        const updated = await userService.updateProfile({
          fullName: form.fullName.trim(),
          bio: form.bio,
          avatar: pendingAvatar,
        });
        if (
          activeUserIdRef.current !== requestUserId
          || getAuthGeneration() !== requestGeneration
        ) return;

        setProfile(updated);
        setForm(toForm(updated));
        updateUser(updated);
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.publicInstructors.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.courseDetails.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.publishedCourses.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all }),
        ]);

        isDirtyRef.current = false;
        setPendingAvatar(null);
        setAvatarPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        showToast('Đã lưu thông tin cá nhân', 'success');
      } catch (err) {
        if (
          activeUserIdRef.current !== requestUserId
          || getAuthGeneration() !== requestGeneration
        ) return;
        showToast(getApiErrorMessage(err, 'Không thể lưu thông tin. Vui lòng thử lại sau.'), 'error');
      } finally {
        if (
          activeUserIdRef.current === requestUserId
          && getAuthGeneration() === requestGeneration
        ) setIsSaving(false);
      }
    },
    [form, pendingAvatar, showToast, updateUser, userId]
  );

  const isDirty =
    !!profile &&
    (form.fullName !== (profile.fullName ?? '') ||
      form.bio !== (profile.bio ?? '') ||
      pendingAvatar !== null);

  return {
    profile, setProfile, form, error, editingField, setEditingField,
    pendingAvatar, avatarPreview, isSaving, fileInputRef,
    handleFieldChange, handlePickAvatar, handleSave, isDirty,
  };
};
