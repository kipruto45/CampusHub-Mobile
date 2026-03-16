// Native social authentication helpers (Google Sign-In, Microsoft MSAL)

import { Platform } from 'react-native';

export type NativeProvider = 'google' | 'microsoft';

export type NativeProviderTokens = {
  idToken?: string;
  accessToken?: string;
};

export type NativeAuthResult = {
  success: boolean;
  tokens?: NativeProviderTokens;
  error?: string;
  fallbackToWeb?: boolean;
};

const getEnv = (key: string): string => String(process.env[key] || '').trim();

const getGoogleConfig = () => ({
  webClientId:
    getEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') ||
    getEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  iosClientId: getEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  androidClientId: getEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  iosUrlScheme: getEnv('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME'),
});

const hasGoogleConfig = (): boolean => {
  const config = getGoogleConfig();
  if (
    !config.webClientId ||
    (Platform.OS === 'ios' && !config.iosUrlScheme)
  ) {
    return false;
  }
  if (Platform.OS === 'ios' && !config.iosUrlScheme) {
    return false;
  }
  return true;
};

const getMicrosoftConfig = () => ({
  clientId: getEnv('EXPO_PUBLIC_MICROSOFT_CLIENT_ID'),
  tenantId: getEnv('EXPO_PUBLIC_MICROSOFT_TENANT_ID') || 'common',
  redirectUriAndroid:
    getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI_ANDROID') ||
    getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI'),
  redirectUriIos:
    getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI_IOS') ||
    getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI'),
  redirectUri: Platform.select({
    android:
      getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI_ANDROID') ||
      getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI'),
    ios:
      getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI_IOS') ||
      getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI'),
    default: getEnv('EXPO_PUBLIC_MICROSOFT_REDIRECT_URI'),
  }),
  androidSignatureHash: getEnv('EXPO_PUBLIC_MICROSOFT_ANDROID_SIGNATURE_HASH'),
});

const hasMicrosoftConfig = (): boolean => {
  const config = getMicrosoftConfig();
  if (!config.clientId || !config.redirectUri) {
    return false;
  }
  if (Platform.OS === 'android' && !config.androidSignatureHash) {
    return false;
  }
  return true;
};

let googleConfigured = false;

const signInWithGoogleNative = async (): Promise<NativeAuthResult> => {
  const config = getGoogleConfig();
  if (!config.webClientId) {
    return {
      success: false,
      error: 'Google native auth is not configured',
      fallbackToWeb: true,
    };
  }

  let GoogleSignin: any;
  let statusCodes: any;
  try {
    const googleModule = (await import('@react-native-google-signin/google-signin')) as any;
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
  } catch (error) {
    return {
      success: false,
      error: 'Google native module is not installed',
      fallbackToWeb: true,
    };
  }

  try {
    if (!googleConfigured) {
      const configuration: Record<string, unknown> = {
        webClientId: config.webClientId,
        offlineAccess: true,
      };
      if (config.iosClientId) {
        configuration.iosClientId = config.iosClientId;
      }
      if (config.androidClientId) {
        configuration.androidClientId = config.androidClientId;
      }
      GoogleSignin.configure(configuration);
      googleConfigured = true;
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const tokenResult = (await GoogleSignin.getTokens?.()) || {};
    const idToken = userInfo?.idToken || tokenResult?.idToken;
    const accessToken = tokenResult?.accessToken || userInfo?.accessToken;

    if (!idToken && !accessToken) {
      return { success: false, error: 'Google did not return tokens' };
    }

    return {
      success: true,
      tokens: { idToken, accessToken },
    };
  } catch (error: any) {
    if (statusCodes && error?.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign-in cancelled' };
    }
    if (statusCodes && error?.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Google sign-in already in progress' };
    }
    return { success: false, error: error?.message || 'Google sign-in failed' };
  }
};

const signInWithMicrosoftNative = async (): Promise<NativeAuthResult> => {
  const config = getMicrosoftConfig();
  if (
    !config.clientId ||
    !config.redirectUri ||
    (Platform.OS === 'android' && !config.androidSignatureHash)
  ) {
    return {
      success: false,
      error: 'Microsoft native auth is not configured',
      fallbackToWeb: true,
    };
  }

  let PublicClientApplication: any;
  let MSALPromptType: any;
  try {
    const msalModule = (await import('react-native-msal')) as any;
    PublicClientApplication =
      msalModule.default ?? msalModule.PublicClientApplication;
    MSALPromptType = msalModule.MSALPromptType;
  } catch (error) {
    return {
      success: false,
      error: 'Microsoft native module is not installed',
      fallbackToWeb: true,
    };
  }

  try {
    const authority = `https://login.microsoftonline.com/${config.tenantId}`;
    const msalConfig: Record<string, any> = {
      auth: {
        clientId: config.clientId,
        authority,
        ...(config.redirectUri ? { redirectUri: config.redirectUri } : {}),
      },
    };

    const pca = new PublicClientApplication(msalConfig);
    await pca.init();

    const interactiveParams: Record<string, any> = {
      scopes: ['User.Read'],
    };
    if (MSALPromptType?.SELECT_ACCOUNT !== undefined) {
      interactiveParams.promptType = MSALPromptType.SELECT_ACCOUNT;
    }
    const result = await pca.acquireToken(interactiveParams);

    const accessToken = result?.accessToken;
    const idToken = result?.idToken;

    if (!accessToken) {
      return { success: false, error: 'Microsoft did not return an access token' };
    }

    return {
      success: true,
      tokens: { accessToken, idToken },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Microsoft sign-in failed' };
  }
};

export const canUseNativeProvider = (provider: NativeProvider): boolean =>
  provider === 'google' ? hasGoogleConfig() : hasMicrosoftConfig();

export const signInWithNativeProvider = async (
  provider: NativeProvider
): Promise<NativeAuthResult> => {
  return provider === 'google'
    ? signInWithGoogleNative()
    : signInWithMicrosoftNative();
};
