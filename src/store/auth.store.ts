// Auth Store for CampusResources - Zustand

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  authAPI,
  setAuthToken,
  clearAuthToken,
  setRefreshToken,
  setRefreshTokenCallback,
  setSessionInvalidationCallback,
} from '../services/api';
import { notificationService } from '../services/notifications';
import type { AppRole } from '../lib/auth-routing';
import { resolveHomeRouteByRole } from '../lib/auth-routing';

const memoryStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (name: string) => (name in store ? store[name] : null),
    setItem: (name: string, value: string) => {
      store[name] = value;
    },
    removeItem: (name: string) => {
      delete store[name];
    },
  };
})();

const getPersistStorage = () => {
  const webStorage = (globalThis as any)?.localStorage;
  if (webStorage) {
    return webStorage;
  }
  return memoryStorage;
};

const APP_CACHE_KEYS = ['auth-storage'];

const EMPTY_AUTH_STATE = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const clearClientCache = () => {
  const storage = getPersistStorage();
  APP_CACHE_KEYS.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // Best effort only.
    }
  });

  const sessionStorageRef = (globalThis as any)?.sessionStorage;
  if (sessionStorageRef) {
    APP_CACHE_KEYS.forEach((key) => {
      try {
        sessionStorageRef.removeItem(key);
      } catch {
        // Best effort only.
      }
    });
  }
};

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  registration_number: string;
  avatar?: string;
  role: AppRole;
  department?: string;
  faculty?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<string>;
  register: (data: {
    email: string;
    password: string;
    password_confirm: string;
    registration_number?: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    faculty?: number;
    department?: number;
    course?: number;
    year_of_study?: number;
  }) => Promise<void>;
  socialLogin: (
    provider: 'google' | 'microsoft',
    tokens: { accessToken: string; refreshToken?: string }
  ) => Promise<string>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  initializeAuth: () => void;
  getHomeRoute: () => string;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const clearSessionState = () => {
        set(EMPTY_AUTH_STATE);
        clearClientCache();
      };

      const registerSessionInvalidationCallback = () => {
        setSessionInvalidationCallback(() => {
          clearSessionState();
        });
      };

      registerSessionInvalidationCallback();

      return {
      ...EMPTY_AUTH_STATE,

      login: async (email: string, password: string, rememberMe: boolean = false) => {
        set({ isLoading: true, error: null });
        try {
          // Check if email looks like a registration number (e.g., CS/2021/001)
          const isRegistrationNumber = /^[A-Z]+\/\d{4}\/\d+$/i.test(email.trim());
          
          const response = await authAPI.login(
            isRegistrationNumber ? '' : email, 
            password,
            isRegistrationNumber ? email : undefined,
            rememberMe
          );
          const { access_token, refresh_token, user } = response.data.data;

          // Store tokens
          setAuthToken(access_token);
          setRefreshToken(refresh_token);
          setRefreshTokenCallback(({ accessToken, refreshToken }) => {
            set((state) => ({
              accessToken,
              refreshToken: refreshToken ?? state.refreshToken,
            }));
          });
          
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            user: user,
            isAuthenticated: true,
            isLoading: false,
          });

          return resolveHomeRouteByRole(user?.role);
        } catch (error: any) {
          const message = error.response?.data?.error?.message || error.response?.data?.message || 'Login failed. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(data);
          // After registration, typically need email verification
          // Mobile API returns { success: true, data: { user_id, email, message } }
          set({ isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            await authAPI.logout(refreshToken);
          }
          // Unregister from push notifications (best effort - ignore errors)
          if (notificationService?.unregisterPushNotifications) {
            await notificationService.unregisterPushNotifications();
          }
        } catch {
          // Ignore logout API errors
        } finally {
          clearAuthToken();
          clearSessionState();
        }
      },

      // Social login (Google/Microsoft)
      socialLogin: async (provider: 'google' | 'microsoft', tokens: { accessToken: string; refreshToken?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const { accessToken, refreshToken } = tokens;

          // Store tokens
          setAuthToken(accessToken);
          if (refreshToken) {
            setRefreshToken(refreshToken);
          }
          setRefreshTokenCallback(({ accessToken: nextAccess, refreshToken: nextRefresh }) => {
            set((state) => ({
              accessToken: nextAccess,
              refreshToken: nextRefresh ?? state.refreshToken,
            }));
          });

          // Fetch user profile
          const response = await authAPI.getCurrentUser();
          const userData = response.data.data || response.data;

          set({
            accessToken,
            refreshToken: refreshToken ?? null,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });

          return resolveHomeRouteByRole(userData?.role);
        } catch (error: any) {
          const message = error.response?.data?.error?.message || error.response?.data?.message || `${provider} login failed. Please try again.`;
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await authAPI.refreshToken(refreshToken);
          const { access_token, refresh_token } = response.data.data;
          setAuthToken(access_token);
          setRefreshToken(refresh_token);
          set({ accessToken: access_token, refreshToken: refresh_token });
        } catch {
          // Token refresh failed - logout
          get().logout();
          throw new Error('Session expired');
        }
      },

      // Fetch current user profile
      fetchCurrentUser: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          return;
        }

        try {
          const response = await authAPI.getCurrentUser();
          const userData = response.data.data || response.data;
          set({ user: userData, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to fetch current user:', error);
          if (!get().refreshToken) {
            clearSessionState();
          }
        }
      },

      // Initialize auth state from persisted storage
      initializeAuth: () => {
        const { accessToken, refreshToken, user } = get();
        if (accessToken) {
          registerSessionInvalidationCallback();
          setAuthToken(accessToken);
          setRefreshToken(refreshToken);
          setRefreshTokenCallback(({ accessToken: nextAccess, refreshToken: nextRefresh }) => {
            set((state) => ({
              accessToken: nextAccess,
              refreshToken: nextRefresh ?? state.refreshToken,
            }));
          });
          // Fetch fresh user data
          get().fetchCurrentUser();
        }
      },

      getHomeRoute: () => resolveHomeRouteByRole(get().user?.role),

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading) => set({ isLoading: loading }),
    };
    },
    {
      name: 'auth-storage',
      storage: createJSONStorage(getPersistStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
