import { parseRuntimeConfig, resolveConfiguredUrl } from './runtimeConfig.shared';

export const runtimeConfig = parseRuntimeConfig(import.meta.env);

export const buildApiUrl = (path: string): string =>
  resolveConfiguredUrl(path, runtimeConfig.apiBaseUrl, 'VITE_API_BASE_URL');

export const resolveHlsUrl = (urlOrPath: string): string =>
  resolveConfiguredUrl(urlOrPath, runtimeConfig.hlsBaseUrl, 'VITE_HLS_BASE_URL');
