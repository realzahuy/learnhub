export interface RuntimeConfig {
  apiBaseUrl: string;
  hlsBaseUrl: string;
}

type RuntimeEnvironment = Record<string, string | boolean | undefined>;

const requiredHttpUrl = (name: string, rawValue: string | boolean | undefined): string => {
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc ${name}`);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} phải là URL hợp lệ`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} chỉ chấp nhận giao thức http hoặc https`);
  }
  if (url.username || url.password) {
    throw new Error(`${name} không được chứa thông tin đăng nhập`);
  }
  if (url.search || url.hash) {
    throw new Error(`${name} không được chứa query hoặc fragment`);
  }

  return url.toString().replace(/\/+$/, '');
};

export const parseRuntimeConfig = (env: RuntimeEnvironment): RuntimeConfig =>
  Object.freeze({
    apiBaseUrl: requiredHttpUrl('VITE_API_BASE_URL', env.VITE_API_BASE_URL),
    hlsBaseUrl: requiredHttpUrl('VITE_HLS_BASE_URL', env.VITE_HLS_BASE_URL),
  });

export const resolveConfiguredUrl = (
  urlOrPath: string,
  configuredBaseUrl: string,
  configName: string
): string => {
  const value = urlOrPath.trim();
  if (!value) {
    throw new Error('URL không được để trống');
  }

  const baseUrl = new URL(`${configuredBaseUrl}/`);
  let resolved: URL;
  try {
    resolved = new URL(value);
  } catch {
    // Backend hiện trả đường dẫn bắt đầu bằng /api. Xem nó là đường dẫn
    // tương đối với base đã cấu hình để không làm mất prefix của gateway.
    resolved = new URL(value.replace(/^\/+/, ''), baseUrl);
  }

  if (resolved.origin !== baseUrl.origin) {
    throw new Error(`URL phải cùng origin với ${configName}`);
  }
  return resolved.toString();
};
