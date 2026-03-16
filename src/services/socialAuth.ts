// Social Login Service
// Exchanges provider authorization codes for backend JWT tokens.

import { authAPI } from './api';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

export interface OAuthResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
}

export interface NativeOAuthPayload {
  idToken?: string;
  accessToken?: string;
}

const coerceString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const extractPayload = (raw: any): any => {
  if (
    raw &&
    typeof raw === 'object' &&
    Object.prototype.hasOwnProperty.call(raw, 'success') &&
    Object.prototype.hasOwnProperty.call(raw, 'data')
  ) {
    return raw.data;
  }
  return raw;
};

const extractTokens = (raw: any): OAuthTokens | null => {
  const payload = extractPayload(raw) || {};
  const tokenSource = payload.tokens || payload;

  const accessToken =
    coerceString(tokenSource.access) || coerceString(tokenSource.access_token);
  const refreshToken =
    coerceString(tokenSource.refresh) || coerceString(tokenSource.refresh_token);
  const idToken = coerceString(tokenSource.id_token);

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    ...(idToken ? { idToken } : {}),
  };
};

const extractErrorMessage = (error: any): string => {
  const payload = error?.response?.data;
  return (
    payload?.error ||
    payload?.message ||
    payload?.detail ||
    error?.message ||
    'Authentication failed'
  );
};

export const exchangeCodeForTokens = async (
  provider: 'google' | 'microsoft',
  code: string,
  redirectUri?: string
): Promise<OAuthResult> => {
  try {
    const response =
      provider === 'google'
        ? await authAPI.googleOAuth(code, redirectUri)
        : await authAPI.microsoftOAuth(code, redirectUri);

    const tokens = extractTokens(response?.data);
    if (!tokens) {
      return { success: false, error: 'No access token returned by server' };
    }

    return { success: true, tokens };
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
};

export const exchangeNativeTokens = async (
  provider: 'google' | 'microsoft',
  payload: NativeOAuthPayload
): Promise<OAuthResult> => {
  try {
    const response =
      provider === 'google'
        ? await authAPI.googleOAuthNative({
            id_token: payload.idToken,
            access_token: payload.accessToken,
          })
        : await authAPI.microsoftOAuthNative({
            access_token: payload.accessToken || '',
            id_token: payload.idToken,
          });

    const tokens = extractTokens(response?.data);
    if (!tokens) {
      return { success: false, error: 'No access token returned by server' };
    }

    return { success: true, tokens };
  } catch (error: any) {
    console.error('Native token exchange error:', error);
    return {
      success: false,
      error: extractErrorMessage(error),
    };
  }
};

export const loginWithGoogle = async (
  code: string,
  redirectUri?: string
): Promise<OAuthResult> => {
  return exchangeCodeForTokens('google', code, redirectUri);
};

export const loginWithMicrosoft = async (
  code: string,
  redirectUri?: string
): Promise<OAuthResult> => {
  return exchangeCodeForTokens('microsoft', code, redirectUri);
};
