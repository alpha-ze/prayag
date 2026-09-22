import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState } from '@/types';
import { authAPI } from '@/services/api';

interface AuthStore extends AuthState {
  loginByName: (username: string) => Promise<void>;
  loginAdmin: (pin: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      loginByName: async (username: string) => {
        try {
          const { user, token } = await authAPI.loginByName(username);
          localStorage.setItem('prompt_x_token', token);
          set({ user, token, isAuthenticated: true });
        } catch (error) {
          console.error('Name login failed:', error);
          throw error;
        }
      },

      loginAdmin: async (pin: string) => {
        try {
          const { user, token } = await authAPI.loginAdmin(pin);
          localStorage.setItem('prompt_x_token', token);
          set({ user, token, isAuthenticated: true });
        } catch (error) {
          console.error('Admin login failed:', error);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('prompt_x_token');
        set({ user: null, token: null, isAuthenticated: false });
        authAPI.logout().catch(console.error);
      },

      initializeAuth: () => {
        const token = localStorage.getItem('prompt_x_token');
        if (token) {
          authAPI.getProfile()
            .then((user) => {
              set({ user, token, isAuthenticated: true });
            })
            .catch(() => {
              localStorage.removeItem('prompt_x_token');
              set({ user: null, token: null, isAuthenticated: false });
            });
        }
      },
    }),
    {
      name: 'prompt-x-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);