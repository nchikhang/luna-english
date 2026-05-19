import { apiRequest } from './client';
import type { CEFRLevel } from '@/types';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  level: CEFRLevel;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export async function fetchMe(): Promise<{ user: AuthUser }> {
  return apiRequest<{ user: AuthUser }>('/auth/me');
}
