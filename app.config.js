require('dotenv/config');

module.exports = ({ config }) => {
  const baseConfig = config ?? {};
  const plugins = Array.isArray(baseConfig.plugins) ? [...baseConfig.plugins] : [];
  const appScheme = String(process.env.EXPO_PUBLIC_APP_SCHEME || 'campushub').trim() || 'campushub';

  const hasPlugin = (name) =>
    plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] === name : plugin === name));

  // Add Google SignIn plugin if configured
  const googleIosScheme = String(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '').trim();
  if (googleIosScheme && !hasPlugin('@react-native-google-signin/google-signin')) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosScheme }]);
  }

  // Add MSAL plugin if configured
  const msalSignatureHash = String(process.env.EXPO_PUBLIC_MICROSOFT_ANDROID_SIGNATURE_HASH || '').trim();
  if (msalSignatureHash && !hasPlugin('react-native-msal')) {
    plugins.push(['react-native-msal', { androidPackageSignatureHash: msalSignatureHash }]);
  }

  return {
    ...baseConfig,
    // Expo owner so EAS CLI can link without manual edits
    owner: baseConfig.owner || 'kiprutovictor45',
    
    // Orientation (previously in app.json)
    orientation: 'portrait',
    scheme: appScheme,
    
    // Icon (previously in app.json)
    icon: './assets/icon.png',
    
    // User interface style (previously in app.json)
    userInterfaceStyle: 'light',
    
    // Splash screen (previously in app.json)
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    
    // iOS configuration (previously in app.json)
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.campushub.app',
    },
    
    // Android configuration (previously in app.json)
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.campushub.app',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
    },
    
    // Web configuration (previously in app.json)
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    
    // Plugins (previously in app.json)
    plugins: [
      'expo-font',
      'expo-image',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/splash.png',
          imageWidth: 200,
        },
      ],
      ...plugins,
    ],
  };
};
