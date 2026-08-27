
interface JwtPayload {
  sub?: string;

  roles?: string[];
  type?: string;
  exp?: number;
}

const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );

    return JSON.parse(json);
  } catch {

    return null;
  }
};

export const getRolesFromToken = (token: string | null): string[] => {
  if (!token) return [];
  return decodeJwt(token)?.roles ?? [];
};
