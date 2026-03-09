export type AppRole = 'student' | 'admin' | 'moderator' | 'staff' | 'unknown';

export const AUTH_LOGIN_ROUTE = '/(auth)/login' as const;
export const STUDENT_HOME_ROUTE = '/(student)/tabs/home' as const;
export const ADMIN_HOME_ROUTE = '/(admin)/dashboard' as const;

export const normalizeRole = (role?: string | null): AppRole => {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return 'unknown';
  if (value === 'student') return 'student';
  if (value === 'admin') return 'admin';
  if (value === 'moderator') return 'moderator';
  if (value === 'staff') return 'staff';
  return 'unknown';
};

export const isAdminRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'moderator' || normalized === 'staff';
};

export const resolveHomeRouteByRole = (role?: string | null) =>
  isAdminRole(role) ? ADMIN_HOME_ROUTE : STUDENT_HOME_ROUTE;
