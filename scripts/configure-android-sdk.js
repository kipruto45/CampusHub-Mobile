const fs = require('fs');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const localPropertiesPath = path.join(androidDir, 'local.properties');

const candidates = [
  { label: 'ANDROID_SDK_ROOT', value: process.env.ANDROID_SDK_ROOT },
  { label: 'ANDROID_HOME', value: process.env.ANDROID_HOME },
  { label: 'default Linux/macOS path', value: path.join(os.homedir(), 'Android', 'Sdk') },
  { label: 'legacy Linux path', value: path.join(os.homedir(), 'android-sdk') },
];

const existingSdk = candidates.find(({ value }) => {
  if (!value) {
    return false;
  }

  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
});

if (!existingSdk) {
  const checkedPaths = candidates
    .map(({ label, value }) => `${label}: ${value || '(not set)'}`)
    .join('\n');

  console.error(
    `Android SDK not found.\nChecked:\n${checkedPaths}\n\nInstall the SDK and re-run this command, or set ANDROID_SDK_ROOT.`
  );
  process.exit(1);
}

const sdkPath = existingSdk.value.replace(/\\/g, '/');
const sdkLine = `sdk.dir=${sdkPath}`;

let currentLines = [];
if (fs.existsSync(localPropertiesPath)) {
  currentLines = fs
    .readFileSync(localPropertiesPath, 'utf8')
    .split(/\r?\n/)
    .filter((line, index, lines) => !(index === lines.length - 1 && line === ''));
}

let replaced = false;
const nextLines = currentLines.map((line) => {
  if (line.startsWith('sdk.dir=')) {
    replaced = true;
    return sdkLine;
  }

  return line;
});

if (!replaced) {
  nextLines.push(sdkLine);
}

fs.writeFileSync(localPropertiesPath, `${nextLines.join('\n')}\n`);

console.log(`Configured Android SDK in android/local.properties`);
console.log(`Path: ${sdkPath}`);
console.log(`Source: ${existingSdk.label}`);
