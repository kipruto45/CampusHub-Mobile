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
  normalizeAbsoluteAppUrl,
} from '../services/api';
import { notificationService } from '../services/notifications';
import { biometricService } from '../services/biometric';
import type { AppRole } from '../lib/auth-routing';
import { resolveHomeRouteByRole, STUDENT_HOME_ROUTE } from '../lib/auth-routing';

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
const CURRENT_USER_FRESH_MS = 60_000;

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

const normalizeStoredName = (value: any): string => {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) return '';
  const lowered = cleaned.toLowerCase();
  if (['null', 'undefined', 'none', 'nil'].includes(lowered)) return '';
  return cleaned;
};

const sanitizeStoredUser = (user: User | null): User | null => {
  if (!user) return user;
  const first = normalizeStoredName((user as any).first_name);
  const last = normalizeStoredName((user as any).last_name);
  const full = normalizeStoredName((user as any).full_name) || `${first} ${last}`.trim();
  return {
    ...user,
    first_name: first,
    last_name: last,
    ...(full ? { full_name: full } : {}),
    avatar: normalizeAbsoluteAppUrl((user as any).avatar) || '',
  };
};

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  registration_number: string;
  avatar?: string;
  full_name?: string;
  role: AppRole;
  department?: string;
  faculty?: string;
  course?: string;
  auth_provider?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    twoFactorCode?: string
  ) => Promise<string>;
  loginWithBiometric: (refreshToken: string) => Promise<string>;
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
      let currentUserRequest: Promise<void> | null = null;
      let lastCurrentUserFetchAt = 0;
      let lastInitializedToken: string | null = null;

      const resetInitializationState = () => {
        currentUserRequest = null;
        lastCurrentUserFetchAt = 0;
        lastInitializedToken = null;
      };

      const syncBiometricToken = async (token?: string | null) => {
        if (!token) return;
        try {
          const enabled = await biometricService.isBiometricEnabled();
          if (enabled) {
            await biometricService.storeAuthKey(token);
          }
        } catch {
          // Best effort only.
        }
      };

      const clearBiometricToken = async () => {
        try {
          await biometricService.deleteAuthKey();
        } catch {
          // Best effort only.
        }
      };

      const clearSessionState = () => {
        resetInitializationState();
        void clearBiometricToken();
        set(EMPTY_AUTH_STATE);
        clearClientCache();
      };

      const registerSessionInvalidationCallback = () => {
        setSessionInvalidationCallback(() => {
          clearSessionState();
        });
      };

      const registerRefreshTokenCallback = () => {
        setRefreshTokenCallback(({ accessToken, refreshToken }) => {
          const nextRefresh = refreshToken ?? get().refreshToken;
          if (nextRefresh) {
            void syncBiometricToken(nextRefresh);
          }
          set((state) => ({
            accessToken,
            refreshToken: refreshToken ?? state.refreshToken,
          }));
        });
      };

      registerSessionInvalidationCallback();

      return {
      ...EMPTY_AUTH_STATE,

      login: async (
        email: string,
        password: string,
        rememberMe: boolean = false,
        twoFactorCode?: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          // Check if email looks like a registration number (e.g., CS/2021/001)
          const isRegistrationNumber = /^[A-Z]+\/\d{4}\/\d+$/i.test(email.trim());
          
          const response = await authAPI.login(
            isRegistrationNumber ? '' : email, 
            password,
            isRegistrationNumber ? email : undefined,
            rememberMe,
            twoFactorCode
          );
          const { access_token, refresh_token, user } = response.data.data;

          // Debug: Log user role for debugging
          console.log('Login successful - User role:', user?.role);

          // Store tokens
          setAuthToken(access_token);
          setRefreshToken(refresh_token);
          registerRefreshTokenCallback();
          
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            user: user,
            isAuthenticated: true,
            isLoading: false,
          });
          void syncBiometricToken(refresh_token);
          lastCurrentUserFetchAt = Date.now();
          lastInitializedToken = access_token;

          return resolveHomeRouteByRole(user?.role) || STUDENT_HOME_ROUTE;
        } catch (error: any) {
          const message = error.response?.data?.error?.message || error.response?.data?.message || 'Login failed. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      loginWithBiometric: async (storedRefreshToken: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.refreshToken(storedRefreshToken);
          const payload = response?.data?.data ?? response?.data ?? {};
          const accessToken = payload?.access_token;
          const refreshToken = payload?.refresh_token || storedRefreshToken;

          if (!accessToken) {
            throw new Error('Unable to refresh session. Please log in again.');
          }

          setAuthToken(accessToken);
          setRefreshToken(refreshToken);
          registerRefreshTokenCallback();

          const profileResponse = await authAPI.getCurrentUser();
          const userData = profileResponse.data.data || profileResponse.data;

          set({
            accessToken,
            refreshToken,
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
          void syncBiometricToken(refreshToken);
          lastCurrentUserFetchAt = Date.now();
          lastInitializedToken = accessToken;

          return resolveHomeRouteByRole(userData?.role) || STUDENT_HOME_ROUTE;
        } catch (error: any) {
          const message =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error?.message ||
            'Biometric login failed. Please try again.';
          if (error?.response?.status === 400 || error?.response?.status === 401) {
            void clearBiometricToken();
          }
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
          registerRefreshTokenCallback();

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
          if (refreshToken) {
            void syncBiometricToken(refreshToken);
          }
          lastCurrentUserFetchAt = Date.now();
          lastInitializedToken = accessToken;

          return resolveHomeRouteByRole(userData?.role) || STUDENT_HOME_ROUTE;
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
          void syncBiometricToken(refresh_token || refreshToken);
          lastInitializedToken = access_token;
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

        if (currentUserRequest) {
          return currentUserRequest;
        }

        currentUserRequest = (async () => {
          try {
            const response = await authAPI.getCurrentUser();
            const userData = response.data.data || response.data;
            set({ user: userData, isAuthenticated: true });
            lastCurrentUserFetchAt = Date.now();
            lastInitializedToken = accessToken;
          } catch (error) {
            console.error('Failed to fetch current user:', error);
            if (!get().refreshToken) {
              clearSessionState();
            }
          } finally {
            currentUserRequest = null;
          }
        })();

        return currentUserRequest;
      },

      // Initialize auth state from persisted storage
      initializeAuth: () => {
        const { accessToken, refreshToken, user } = get();
        registerSessionInvalidationCallback();

        if (user) {
          set({ user: sanitizeStoredUser(user) });
        }

        if (accessToken) {
          setAuthToken(accessToken);
          setRefreshToken(refreshToken);
          registerRefreshTokenCallback();

          const isFreshSession =
            lastInitializedToken === accessToken &&
            Boolean(user) &&
            Date.now() - lastCurrentUserFetchAt < CURRENT_USER_FRESH_MS;

          if (!currentUserRequest && !isFreshSession) {
            lastInitializedToken = accessToken;
            void get().fetchCurrentUser();
          }
        }
      },

      getHomeRoute: () => resolveHomeRouteByRole(get().user?.role) || STUDENT_HOME_ROUTE,

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          const normalized: Partial<User> = { ...userData };
          if ('avatar' in userData) {
            normalized.avatar = normalizeAbsoluteAppUrl(userData.avatar) || userData.avatar || '';
          }
          if ('first_name' in userData) {
            normalized.first_name = normalizeStoredName((userData as any).first_name);
          }
          if ('last_name' in userData) {
            normalized.last_name = normalizeStoredName((userData as any).last_name);
          }
          if ('full_name' in userData) {
            (normalized as any).full_name = normalizeStoredName((userData as any).full_name);
          }
          set({ user: { ...user, ...normalized } });
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
