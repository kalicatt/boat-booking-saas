import type { CapacitorConfig } from '@capacitor/cli';

const fallbackDevServer = process.env.CAP_FALLBACK_SERVER_URL ?? 'http://192.168.1.55:3000'

const serverUrl = process.env.CAP_SERVER_URL ?? (process.env.NODE_ENV === 'production' ? undefined : fallbackDevServer)

const serverConfig = serverUrl
  ? {
      url: serverUrl,
      cleartext: serverUrl.startsWith('http://'),
      appendUserAgent: ' SweetNarcisseApp'
    }
  : undefined;

const config: CapacitorConfig = {
  appId: 'com.sweetnarcisse.admin',
  appName: 'Sweet Narcisse Admin',
  webDir: 'out',
  server: serverConfig as unknown as CapacitorConfig['server'] | undefined,
  ios: {
    backgroundColor: '#0f172a'
  },
  android: {
    backgroundColor: '#0f172a'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f172a',
      overlaysWebView: false
    }
  }
};

export default config;
