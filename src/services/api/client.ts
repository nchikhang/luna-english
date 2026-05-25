/**
 * HTTP client cho Luna backend.
 *
 * - Tự attach JWT từ AuthStore vào header.
 * - Tự throw ApiError có code để UI xử lý.
 * - Đọc base URL từ env (app.json extra hoặc EXPO_PUBLIC_API_URL).
 */

import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Bỏ qua attach token (dùng cho /auth/login, /auth/register) */
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(path, API_URL);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (!options.skipAuth) {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new ApiError('Không thể kết nối tới server', 0, 'NETWORK');
  }

  // 401 → token hết hạn, logout user
  if (response.status === 401 && !options.skipAuth) {
    useAuthStore.getState().logout();
    throw new ApiError('Phiên đăng nhập đã hết hạn', 401, 'UNAUTHORIZED');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message ?? `Request failed: ${response.status}`,
      response.status,
      data.error
    );
  }

  return data as T;
}
