
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 50;
export const EMAIL_MAX = 100;
export const FULL_NAME_MAX = 100;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const SPECIAL_CHARS = "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?";

export interface RegisterFormValues {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>;

export const validatePasswordStrength = (password: string): string | null => {
  const violations: string[] = [];

  if (password.length < PASSWORD_MIN) violations.push(`ít nhất ${PASSWORD_MIN} ký tự`);
  if (password.length > PASSWORD_MAX) violations.push(`không quá ${PASSWORD_MAX} ký tự`);

  let hasUppercase = false;
  let hasLowercase = false;
  let hasDigit = false;
  let hasSpecial = false;

  for (const char of password) {
    if (char >= 'A' && char <= 'Z') hasUppercase = true;
    else if (char >= 'a' && char <= 'z') hasLowercase = true;
    else if (char >= '0' && char <= '9') hasDigit = true;
    else if (SPECIAL_CHARS.includes(char)) hasSpecial = true;
  }

  if (!hasUppercase) violations.push('ít nhất 1 chữ hoa');
  if (!hasLowercase) violations.push('ít nhất 1 chữ thường');
  if (!hasDigit) violations.push('ít nhất 1 chữ số');
  if (!hasSpecial) violations.push('ít nhất 1 ký tự đặc biệt');

  return violations.length > 0 ? `Mật khẩu phải có: ${violations.join(', ')}` : null;
};

export const validateRegisterForm = (values: RegisterFormValues): RegisterFormErrors => {
  const errors: RegisterFormErrors = {};

  const fullName = values.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Họ tên không được để trống';
  } else if (fullName.length > FULL_NAME_MAX) {
    errors.fullName = `Họ tên không được vượt quá ${FULL_NAME_MAX} ký tự`;
  }

  const username = values.username.trim();
  if (!username) {
    errors.username = 'Tên đăng nhập không được để trống';
  } else if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    errors.username = `Tên đăng nhập phải từ ${USERNAME_MIN} đến ${USERNAME_MAX} ký tự`;
  }

  const email = values.email.trim();
  if (!email) {
    errors.email = 'Email không được để trống';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

    errors.email = 'Email không đúng định dạng';
  } else if (email.length > EMAIL_MAX) {
    errors.email = `Email không được vượt quá ${EMAIL_MAX} ký tự`;
  }

  if (!values.password) {
    errors.password = 'Mật khẩu không được để trống';
  } else {
    const passwordError = validatePasswordStrength(values.password);
    if (passwordError) errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Vui lòng nhập lại mật khẩu';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
  }

  return errors;
};
