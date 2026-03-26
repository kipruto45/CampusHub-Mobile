export type AppRole =
  | 'student'
  | 'instructor'
  | 'department_head'
  | 'admin'
  | 'moderator'
  | 'staff'
  | 'support_staff'
  | 'unknown';

export const AUTH_LOGIN_ROUTE = '/(auth)/login' as const;
export const STUDENT_HOME_ROUTE = '/(student)/tabs/home' as const;
export const ADMIN_HOME_ROUTE = '/(admin)/dashboard' as const;
export const ADMIN_ACCESS_ROUTE = '/(admin)/access' as const;

export const normalizeRole = (role?: string | null): AppRole => {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return 'unknown';
  
  // Check for exact matches
  if (value === 'student' || value.includes('student')) return 'student';
  if (value === 'instructor' || value.includes('instructor')) return 'instructor';
  if (value === 'admin' || value.includes('admin')) return 'admin';
  if (value === 'moderator' || value.includes('moderator')) return 'moderator';
  if (value === 'department_head' || value.includes('department head') || value.includes('department_head')) {
    return 'department_head';
  }
  if (value === 'support_staff' || value.includes('support staff') || value.includes('support_staff')) {
    return 'support_staff';
  }
  if (value === 'staff' || value.includes('staff')) return 'staff';
  
  return 'unknown';
};

export const isAdminRole = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  return (
    normalized === 'admin' ||
    normalized === 'moderator' ||
    normalized === 'staff' ||
    normalized === 'support_staff' ||
    normalized === 'department_head'
  );
};

export const resolveHomeRouteByRole = (role?: string | null): string => {
  const normalizedRole = normalizeRole(role);
  const route = isAdminRole(role) ? ADMIN_HOME_ROUTE : STUDENT_HOME_ROUTE;
  console.log('Resolving route for role:', role, '-> normalized:', normalizedRole, '-> route:', route);
  return route;
};
