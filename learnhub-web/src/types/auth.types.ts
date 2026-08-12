
export const ROLE_INSTRUCTOR = 'ROLE_INSTRUCTOR';
export const ROLE_ADMIN = 'ROLE_ADMIN';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatar: string | null;
  bio: string | null;
  emailVerified: boolean;

  lastLogin: string | null;
}
