import { authAPI,setSessionInvalidationCallback } from '../../services/api';
import { useAuthStore } from '../auth.store';

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
  setRefreshTokenCallback: jest.fn(),
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

const emptyState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

describe('auth store', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await useAuthStore.getState().logout();
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

  it('returns verification details after registration without authenticating the user', async () => {
    (authAPI.register as any).mockResolvedValue({
      data: {
        data: {
          user_id: 'user-2',
          email: 'new-user@example.com',
          message: 'Registration successful. Please verify your email before logging in.',
          requires_email_verification: true,
        },
      },
    });

    const result = await useAuthStore.getState().register({
      email: 'new-user@example.com',
      password: 'SecurePass123!',
      password_confirm: 'SecurePass123!',
      first_name: 'New',
      last_name: 'User',
    });

    expect(result).toEqual({
      user_id: 'user-2',
      email: 'new-user@example.com',
      message: 'Registration successful. Please verify your email before logging in.',
      requires_email_verification: true,
    });
    expect(useAuthStore.getState()).toMatchObject(emptyState);
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

  it('deduplicates repeated auth initialization while the profile request is in flight', async () => {
    let resolveProfile!: (value: any) => void;
    const profileRequest = new Promise((resolve) => {
      resolveProfile = resolve;
    });
    (authAPI.getCurrentUser as any).mockReturnValue(profileRequest);

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
    useAuthStore.getState().initializeAuth();

    expect(authAPI.getCurrentUser).toHaveBeenCalledTimes(1);

    resolveProfile({
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

    await profileRequest;
  });

  it('reuses the fresh profile after initialization instead of fetching again immediately', async () => {
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
    await Promise.resolve();
    await Promise.resolve();

    useAuthStore.getState().initializeAuth();
    await Promise.resolve();

    expect(authAPI.getCurrentUser).toHaveBeenCalledTimes(1);
  });
});
