export type AdminFeatureKey =
  | 'manage_users'
  | 'manage_faculties'
  | 'manage_departments'
  | 'moderate_content'
  | 'view_analytics'
  | 'export_data'
  | 'system_settings'
  | 'manage_billing'
  | 'manage_referrals'
  | 'manage_payments';

export type AdminFeatureRequirement = AdminFeatureKey | AdminFeatureKey[];

export type AdminFeaturePermissions = Partial<Record<AdminFeatureKey, boolean>>;

export interface AdminScopeInfo {
  role?: string;
  institution?: string;
  faculty?: string;
  department?: string;
}

const ADMIN_FEATURE_KEYS: AdminFeatureKey[] = [
  'manage_users',
  'manage_faculties',
  'manage_departments',
  'moderate_content',
  'view_analytics',
  'export_data',
  'system_settings',
  'manage_billing',
  'manage_referrals',
  'manage_payments',
];

export const normalizeAdminFeaturePermissions = (value: any): AdminFeaturePermissions => {
  const next: AdminFeaturePermissions = {};

  ADMIN_FEATURE_KEYS.forEach((key) => {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      next[key] = Boolean(value[key]);
    }
  });

  return next;
};

export const hasAdminAccess = (
  permissions: AdminFeaturePermissions | null | undefined,
  requirement?: AdminFeatureRequirement
): boolean => {
  if (!requirement) {
    return true;
  }

  // If permissions failed to load, keep the UI usable instead of hiding everything.
  if (!permissions || Object.keys(permissions).length === 0) {
    return true;
  }

  const checks = Array.isArray(requirement) ? requirement : [requirement];
  return checks.some((feature) => Boolean(permissions[feature]));
};

export const formatAdminRoleLabel = (value?: string): string => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return 'Admin';
  return cleaned.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
};

export const formatAdminScopeLabel = (scope?: AdminScopeInfo | null): string => {
  if (!scope) return 'Platform-wide access';

  const label = scope.department || scope.faculty || scope.institution;
  if (!label) {
    return 'Platform-wide access';
  }

  return String(label);
};

export const countEnabledAdminPermissions = (
  permissions: AdminFeaturePermissions | null | undefined
): number => {
  if (!permissions) return 0;
  return Object.values(permissions).filter(Boolean).length;
};
