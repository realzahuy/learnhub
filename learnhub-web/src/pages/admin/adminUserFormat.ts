const ROLE_LABELS: Record<string, string> = {
  ROLE_USER: 'Học viên',
  ROLE_INSTRUCTOR: 'Giảng viên',
  ROLE_ADMIN: 'Quản trị viên',
};

export const formatRoles = (roles: string[]) =>
  roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');

