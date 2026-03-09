let refreshCallback:
  | ((tokens: { accessToken: string; refreshToken?: string | null }) => void)
  | null = null;

jest.mock('../../services/api', () => ({
  __esModule: true,
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  setAuthToken: jest.fn(),
  clearAuthToken: jest.fn(),
  setRefreshToken: jest.fn(),
  setRefreshTokenCallback: jest.fn((callback: any) => {
    refreshCallback = callback;
  }),
  setSessionInvalidationCallback: jest.fn((callback: any) => {
    return callback;
  }),
}));

jest.mock('../../services/notifications', () => ({
  __esModule: true,
  notificationService: {
    unregisterPushNotifications: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../lib/auth-routing', () => ({
  __esModule: true,
  resolveHomeRouteByRole: jest.fn((role?: string) =>
    role === 'admin' ? '/(admin)/dashboard' : '/(student)/tabs/home'
  ),
}));

import { authAPI, setSessionInvalidationCallback } from '../../services/api';
import { useAuthStore } from '../auth.store';

const emptyState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

describe('auth store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshCallback = null;
    useAuthStore.setState(emptyState);
  });

  it('logs in with a registration number and stores returned tokens', async () => {
    (authAPI.login as any).mockResolvedValue({
      data: {
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          user: {
            id: 'user-1',
            email: 'student@test.com',
            first_name: 'Test',
            last_name: 'Student',
            registration_number: 'CS/2021/001',
            role: 'student',
          },
        },
      },
    });

    const route = await useAuthStore
      .getState()
      .login('CS/2021/001', 'testpass123', true);

    expect(authAPI.login).toHaveBeenCalledWith('', 'testpass123', 'CS/2021/001', true);
    expect(route).toBe('/(student)/tabs/home');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token');
    expect(useAuthStore.getState().user?.registration_number).toBe('CS/2021/001');
  });

  it('clears auth state when the API invalidates the session', () => {
    (authAPI.getCurrentUser as any).mockResolvedValue({
      data: {
        data: {
          id: 'user-1',
          email: 'student@test.com',
          first_name: 'Test',
          last_name: 'Student',
          registration_number: 'CS/2021/001',
          role: 'student',
        },
      },
    });

    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        registration_number: 'CS/2021/001',
        role: 'student',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    useAuthStore.getState().initializeAuth();

    const invalidationRegistration = (setSessionInvalidationCallback as any).mock.calls.at(-1)?.[0];
    expect(typeof invalidationRegistration).toBe('function');
    invalidationRegistration('refresh_failed');

    expect(useAuthStore.getState()).toMatchObject(emptyState);
  });

  it('clears stale local auth state when profile fetch fails and no refresh token exists', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (authAPI.getCurrentUser as any).mockRejectedValue(new Error('unauthorized'));

    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'student@test.com',
        first_name: 'Test',
        last_name: 'Student',
        registration_number: 'CS/2021/001',
        role: 'student',
      },
      accessToken: 'stale-access',
      refreshToken: null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    await useAuthStore.getState().fetchCurrentUser();

    expect(authAPI.getCurrentUser).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject(emptyState);
  });
});
