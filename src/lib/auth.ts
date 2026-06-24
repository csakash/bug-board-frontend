import { create } from 'zustand';
import { api } from './api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  fetchMe: async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    set({ user: data.user });
  },
  register: async (name, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    set({ user: data.user });
  },
  logout: async () => {
    await api.post('/api/auth/logout');
    set({ user: null });
  },
}));
