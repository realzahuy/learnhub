import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig, resolveConfiguredUrl } from './runtimeConfig.shared';

describe('parseRuntimeConfig', () => {
  it('chuẩn hóa dấu gạch chéo cuối API URL', () => {
    expect(parseRuntimeConfig({
      VITE_API_BASE_URL: 'https://api.example.com/api/',
      VITE_HLS_BASE_URL: 'https://api.example.com/gateway/',
    })).toEqual({
      apiBaseUrl: 'https://api.example.com/api',
      hlsBaseUrl: 'https://api.example.com/gateway',
    });
  });

  it('từ chối khi thiếu API URL', () => {
    expect(() => parseRuntimeConfig({
      VITE_API_BASE_URL: '',
      VITE_HLS_BASE_URL: 'https://api.example.com',
    }))
      .toThrow('Thiếu biến môi trường bắt buộc VITE_API_BASE_URL');
  });

  it('từ chối khi thiếu HLS base URL', () => {
    expect(() => parseRuntimeConfig({
      VITE_API_BASE_URL: 'https://api.example.com/api',
      VITE_HLS_BASE_URL: '',
    })).toThrow('Thiếu biến môi trường bắt buộc VITE_HLS_BASE_URL');
  });

  it.each([
    'not-a-url',
    'ftp://api.example.com/api',
    'https://user:password@api.example.com/api',
    'https://api.example.com/api?tenant=1',
    'https://api.example.com/api#fragment',
  ])('từ chối API URL không an toàn hoặc không hợp lệ: %s', (value) => {
    expect(() => parseRuntimeConfig({
      VITE_API_BASE_URL: value,
      VITE_HLS_BASE_URL: 'https://api.example.com',
    })).toThrow();
  });
});

describe('resolveConfiguredUrl', () => {
  it('giữ prefix gateway khi backend trả đường dẫn bắt đầu bằng /api', () => {
    expect(resolveConfiguredUrl(
      '/api/learn/videos/1/hls/master.m3u8',
      'https://example.com/backend',
      'VITE_HLS_BASE_URL'
    )).toBe('https://example.com/backend/api/learn/videos/1/hls/master.m3u8');
  });

  it('ghép endpoint API vào đúng API base path', () => {
    expect(resolveConfiguredUrl(
      'auth/refresh',
      'https://example.com/backend/api/v1',
      'VITE_API_BASE_URL'
    )).toBe('https://example.com/backend/api/v1/auth/refresh');
  });

  it('từ chối URL tuyệt đối khác origin đã cấu hình', () => {
    expect(() => resolveConfiguredUrl(
      'https://attacker.example/playlist.m3u8',
      'https://example.com',
      'VITE_HLS_BASE_URL'
    )).toThrow('URL phải cùng origin với VITE_HLS_BASE_URL');
  });
});
