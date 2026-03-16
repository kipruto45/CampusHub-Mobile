// Axios shim to force Metro to use the CommonJS bundle compatible with React Native.
// This bypasses package.exports resolution quirks in axios 1.x.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios/dist/browser/axios.cjs');

export default axios;

