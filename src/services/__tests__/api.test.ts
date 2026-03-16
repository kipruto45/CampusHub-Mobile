jest.mock('expo/virtual/env', () => ({ env: {} }), { virtual: true });

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      hostUri: '192.168.1.8:8081',
    },
  },
}));

import { getDevFallbackApiBaseUrl, getDevRetryBaseUrl } from '../api';

describe('api dev fallback', () => {
  const previousDev = (global as any).__DEV__;

  beforeEach(() => {
    (global as any).__DEV__ = true;
  });

  afterEach(() => {
    (global as any).__DEV__ = previousDev;
  });

  it('builds a local fallback API URL from the Expo host', () => {
    expect(getDevFallbackApiBaseUrl()).toBe('http://192.168.1.8:8000/api');
  });

  it('retries tunnel failures against the local backend in development', () => {
    const retryBaseUrl = getDevRetryBaseUrl(
      {
        response: { status: 503 },
        message: 'Request failed with status code 503',
      } as any,
      {
        baseURL: 'https://campus-hub-test.loca.lt/api',
      } as any
    );

    expect(retryBaseUrl).toBe('http://192.168.1.8:8000/api');
  });

  it('does not retry when the request already targets the local backend', () => {
    const retryBaseUrl = getDevRetryBaseUrl(
      {
        response: { status: 503 },
        message: 'Request failed with status code 503',
      } as any,
      {
        baseURL: 'http://192.168.1.8:8000/api',
      } as any
    );

    expect(retryBaseUrl).toBeNull();
  });
});
