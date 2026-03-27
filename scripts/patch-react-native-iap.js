const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-iap',
  'android',
  'src',
  'play',
  'java',
  'com',
  'dooboolab',
  'rniap',
  'RNIapModule.kt'
);

if (!fs.existsSync(targetPath)) {
  console.log('react-native-iap source not found, skipping local patch.');
  process.exit(0);
}

const original = fs.readFileSync(targetPath, 'utf8');
const search = '        val activity = currentActivity';
const replacement = '        val activity = reactApplicationContext.getCurrentActivity()';

if (original.includes(replacement)) {
  console.log('react-native-iap local patch already applied.');
  process.exit(0);
}

if (!original.includes(search)) {
  console.error('react-native-iap source changed unexpectedly; patch was not applied.');
  process.exit(1);
}

const updated = original.replace(search, replacement);
fs.writeFileSync(targetPath, updated);
console.log('Applied local react-native-iap compatibility patch.');
