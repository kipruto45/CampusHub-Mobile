require('dotenv/config');

const appJson = require('./app.json');

const baseConfig = appJson.expo ?? {};
const plugins = Array.isArray(baseConfig.plugins) ? [...baseConfig.plugins] : [];

const hasPlugin = (name) =>
  plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] === name : plugin === name));

const googleIosScheme = String(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || '').trim();
if (googleIosScheme && !hasPlugin('@react-native-google-signin/google-signin')) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosScheme }]);
}

const msalSignatureHash = String(process.env.EXPO_PUBLIC_MICROSOFT_ANDROID_SIGNATURE_HASH || '').trim();
if (msalSignatureHash && !hasPlugin('react-native-msal')) {
  plugins.push(['react-native-msal', { androidPackageSignatureHash: msalSignatureHash }]);
}

module.exports = {
  expo: {
    ...baseConfig,
    plugins,
  },
};
