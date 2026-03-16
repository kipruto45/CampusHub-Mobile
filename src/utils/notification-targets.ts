type NotificationTarget = {
  kind: 'route' | 'external';
  value: string;
};

type ParsedNotificationLink = {
  raw: string;
  path: string;
  isHttpUrl: boolean;
};

type ResolveStudentTargetParams = {
  link?: string;
  resourceId?: string;
};

type ResolveAdminTargetParams = {
  link?: string;
  resourceId?: string;
};

const APP_LINK_FALLBACK_BASE = 'https://campushub.local';

const stripTrailingSlash = (value: string): string => {
  if (!value || value === '/') {
    return '/';
  }

  return value.replace(/\/+$/, '') || '/';
};

const parseNotificationLink = (value?: string): ParsedNotificationLink | null => {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  if (raw.startsWith('/(')) {
    return {
      raw,
      path: raw,
      isHttpUrl: false,
    };
  }

  const isHttpUrl = /^https?:\/\//i.test(raw);
  const isCustomScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !isHttpUrl;

  try {
    if (isCustomScheme) {
      const url = new URL(raw);
      const pathSegments = [url.hostname, ...url.pathname.split('/').filter(Boolean)];

      return {
        raw,
        path: `/${pathSegments.join('/')}`,
        isHttpUrl: false,
      };
    }

    const url = new URL(raw, APP_LINK_FALLBACK_BASE);
    return {
      raw,
      path: url.pathname || '/',
      isHttpUrl,
    };
  } catch {
    return {
      raw,
      path: raw,
      isHttpUrl,
    };
  }
};

export const resolveStudentNotificationTarget = ({
  link,
  resourceId,
}: ResolveStudentTargetParams): NotificationTarget | null => {
  const normalizedResourceId = String(resourceId || '').trim();
  if (normalizedResourceId) {
    return {
      kind: 'route',
      value: `/(student)/resource/${normalizedResourceId}`,
    };
  }

  const parsed = parseNotificationLink(link);
  if (!parsed) {
    return null;
  }

  if (parsed.path.startsWith('/(')) {
    return {
      kind: 'route',
      value: parsed.path,
    };
  }

  const path = stripTrailingSlash(parsed.path);
  const announcementMatch = path.match(/^\/announcements\/([^/?#]+)$/i);

  if (path === '/announcements') {
    return { kind: 'route', value: '/(student)/announcements' };
  }

  if (announcementMatch) {
    return {
      kind: 'route',
      value: `/(student)/announcements?announcement=${encodeURIComponent(
        announcementMatch[1]
      )}`,
    };
  }

  if (path === '/notifications') {
    return { kind: 'route', value: '/(student)/notifications' };
  }

  if (parsed.isHttpUrl) {
    return {
      kind: 'external',
      value: parsed.raw,
    };
  }

  return null;
};

export const resolveAdminNotificationTarget = ({
  link,
  resourceId,
}: ResolveAdminTargetParams): NotificationTarget | null => {
  const normalizedResourceId = String(resourceId || '').trim();
  if (normalizedResourceId) {
    return {
      kind: 'route',
      value: `/(admin)/resource-detail?id=${encodeURIComponent(normalizedResourceId)}`,
    };
  }

  const parsed = parseNotificationLink(link);
  if (!parsed) {
    return null;
  }

  if (parsed.path.startsWith('/(')) {
    return {
      kind: 'route',
      value: parsed.path,
    };
  }

  const path = stripTrailingSlash(parsed.path);
  const reportMatch = path.match(/^\/reports\/([^/?#]+)$/i);
  const announcementMatch = path.match(/^\/announcements\/([^/?#]+)$/i);

  if (path === '/announcements' || announcementMatch) {
    return { kind: 'route', value: '/(admin)/announcements' };
  }

  if (path === '/notifications') {
    return { kind: 'route', value: '/(admin)/notifications' };
  }

  if (reportMatch) {
    return {
      kind: 'route',
      value: `/(admin)/report-detail?id=${encodeURIComponent(reportMatch[1])}`,
    };
  }

  if (parsed.isHttpUrl) {
    return {
      kind: 'external',
      value: parsed.raw,
    };
  }

  return null;
};
