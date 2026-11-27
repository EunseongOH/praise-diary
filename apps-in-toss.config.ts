import { defineConfig } from '@apps-in-toss/web-framework/config';

/** SDK 3.x WebView config (NOT legacy granite.config.ts).
 * appName matches the registered Apps-in-Toss console identifier exactly.
 * SDK-native header/back may still need visual adjustments after real QR QA.
 */
export default defineConfig({
  appName: 'dajeongrok',
  brand: { primaryColor: '#D3C2EF' },
  permissions: [],
  webBundleDir: 'dist',
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
  },
});
