// Auth Store for CampusResources - Zustand

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
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
  // On native platforms, use AsyncStorage so auth persists across app restarts.
  // On web, fall back to localStorage; otherwise keep an in-memory store.
  if (Platform.OS !== 'web' && AsyncStorage) {
    return AsyncStorage;
  }

  const webStorage = (globalThis as any)?.localStorage;
  if (webStorage) {
    return webStorage;
  }

  return memoryStorage;
};

const APP_CACHE_KEYS = ['auth-storage'];
const CURRENT_USER_FRESH_MS = 60_000;
const SECURE_REFRESH_TOKEN_KEY = 'campushub.refresh_token';
const MIN_REFRESH_LEAD_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry
const FALLBACK_ACCESS_TTL_MS = 55 * 60 * 1000; // fallback if exp missing

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

const decodeBase64 = (value: string): string | null => {
  try {
    if (typeof globalThis.atob === 'function') {
      return globalThis.atob(value);
    }
  } catch {
    // ignore
  }
  return null;
};

const decodeJwtExp = (token?: string | null): number | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = decodeBase64(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
};

const storeRefreshTokenSecure = async (token?: string | null) => {
  if (Platform.OS === 'web') return;
  try {
    if (!token) {
      await SecureStore.deleteItemAsync(SECURE_REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.setItemAsync(SECURE_REFRESH_TOKEN_KEY, token);
    }
  } catch {
    // best effort
  }
};

const loadRefreshTokenSecure = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  try {
    const value = await SecureStore.getItemAsync(SECURE_REFRESH_TOKEN_KEY);
    return value || null;
  } catch {
    return null;
  }
};

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

const clearRefreshTimer = () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
};

const scheduleRefresh = (get: () => AuthState, accessToken?: string | null) => {
  clearRefreshTimer();
  const exp = decodeJwtExp(accessToken);
  const nowMs = Date.now();
  const targetMs = exp ? exp * 1000 : nowMs + FALLBACK_ACCESS_TTL_MS;
  const delay = Math.max(30_000, targetMs - nowMs - MIN_REFRESH_LEAD_MS);
  refreshTimeout = setTimeout(() => {
    get()
      .refreshAccessToken()
      .catch(() => {
        // handled inside refreshAccessToken
      });
  }, delay);
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
  is_active?: boolean;
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
  loginWithMagicLink: (token: string) => Promise<string>;
  requestMagicLink: (email: string) => Promise<void>;
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
      let netinfoUnsubscribe: (() => void) | null = null;

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
        clearRefreshTimer();
        void storeRefreshTokenSecure(null);
        set(EMPTY_AUTH_STATE);
        clearClientCache();
      };

      const registerSessionInvalidationCallback = () => {
        setSessionInvalidationCallback((reason?: string) => {
          clearRefreshTimer();
          clearSessionState();
          if (reason) {
            set({ error: 'Session expired. Please sign in again.' });
          }
        });
      };

      const registerRefreshTokenCallback = () => {
        setRefreshTokenCallback(({ accessToken, refreshToken }) => {
          const nextRefresh = refreshToken ?? get().refreshToken;
          if (nextRefresh) {
            void syncBiometricToken(nextRefresh);
            void storeRefreshTokenSecure(nextRefresh);
          }
          set((state) => ({
            accessToken,
            refreshToken: refreshToken ?? state.refreshToken,
          }));
          scheduleRefresh(get, accessToken);
        });
      };

      registerSessionInvalidationCallback();

      // Reschedule refresh when connectivity returns
      if (!netinfoUnsubscribe) {
        netinfoUnsubscribe = NetInfo.addEventListener((state) => {
          if (state.isConnected && state.isInternetReachable !== false) {
            const token = get().accessToken;
            if (token) {
              scheduleRefresh(get, token);
            }
          }
        });
      }

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
          void storeRefreshTokenSecure(refresh_token);
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
          scheduleRefresh(get, access_token);

          return resolveHomeRouteByRole(user?.role) || STUDENT_HOME_ROUTE;
        } catch (error: any) {
          const message = error.response?.data?.error?.message || error.response?.data?.message || 'Login failed. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      requestMagicLink: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.requestMagicLink(email.trim().toLowerCase());
          set({ isLoading: false });
        } catch (error: any) {
          const message =
            error?.response?.data?.detail ||
            error?.response?.data?.message ||
            error?.message ||
            'Unable to send magic link. Please try again.';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      loginWithMagicLink: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.consumeMagicLink(token);
          const payload = response?.data?.data ?? response?.data ?? {};
          const accessToken = payload?.access_token || payload?.access;
          const refreshToken = payload?.refresh_token || payload?.refresh;

          if (!accessToken || !refreshToken) {
            throw new Error('Magic link is invalid or expired.');
          }

          setAuthToken(accessToken);
          setRefreshToken(refreshToken);
          void storeRefreshTokenSecure(refreshToken);
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
          scheduleRefresh(get, accessToken);

          return resolveHomeRouteByRole(userData?.role) || STUDENT_HOME_ROUTE;
        } catch (error: any) {
          const message =
            error?.response?.data?.detail ||
            error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            error?.message ||
            'Magic link login failed. Please try again.';
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
          void storeRefreshTokenSecure(refreshToken);
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
          scheduleRefresh(get, accessToken);

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
          clearRefreshTimer();
          void storeRefreshTokenSecure(null);
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
            void storeRefreshTokenSecure(refreshToken);
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
          scheduleRefresh(get, accessToken);

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
          void storeRefreshTokenSecure(refresh_token);
          set({ accessToken: access_token, refreshToken: refresh_token });
          void syncBiometricToken(refresh_token || refreshToken);
          lastInitializedToken = access_token;
          scheduleRefresh(get, access_token);
        } catch {
          // Token refresh failed - logout
          set({ error: 'Session expired. Please sign in again.' });
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

        void (async () => {
          const shouldToggleLoading = !get().isLoading;
          if (shouldToggleLoading) {
            set({ isLoading: true });
          }

          let hydratedRefresh = refreshToken;
          if (!hydratedRefresh) {
            hydratedRefresh = await loadRefreshTokenSecure();
            if (hydratedRefresh) {
              // Gate stored sessions behind biometric if enabled
              try {
                const requiresBiometric = await biometricService.shouldUseBiometric();
                if (requiresBiometric) {
                  const authResult = await biometricService.authenticate('Unlock your session');
                  if (!authResult.success) {
                    await storeRefreshTokenSecure(null);
                    await clearBiometricToken();
                    hydratedRefresh = null;
                    set({ error: authResult.error || 'Authentication required to unlock session.' });
                  }
                }
              } catch {
                // If biometric check fails, fall back to allowing refresh token
              }

              if (hydratedRefresh) {
                set({ refreshToken: hydratedRefresh });
                setRefreshToken(hydratedRefresh);
                void syncBiometricToken(hydratedRefresh);
              }
            }
          }

          if (accessToken) {
            setAuthToken(accessToken);
            setRefreshToken(hydratedRefresh);
            registerRefreshTokenCallback();

            const isFreshSession =
              lastInitializedToken === accessToken &&
              Boolean(user) &&
              Date.now() - lastCurrentUserFetchAt < CURRENT_USER_FRESH_MS;

            lastInitializedToken = accessToken;
            scheduleRefresh(get, accessToken);
            if (!currentUserRequest && !isFreshSession) {
              void get().fetchCurrentUser();
            }
            if (shouldToggleLoading) {
              set({ isLoading: false });
            }
            return;
          }

          if (hydratedRefresh) {
            try {
              await get().refreshAccessToken();
              await get().fetchCurrentUser();
            } catch {
              // handled in refreshAccessToken
            }
          }

          if (shouldToggleLoading) {
            set({ isLoading: false });
          }
        })();
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
        accessToken: Platform.OS === 'web' ? state.accessToken : null,
        refreshToken: Platform.OS === 'web' ? state.refreshToken : null,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
