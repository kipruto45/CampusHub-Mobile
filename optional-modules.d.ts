// Optional native modules
// These integrations are feature-flagged and may not be installed in all builds.
// Declaring them keeps TypeScript happy while the app falls back to web auth when absent.

declare module 'expo-router/entry';
declare module '@react-native-google-signin/google-signin';
declare module 'react-native-msal';

