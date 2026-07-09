import { CapacitorConfig } from '@capacitor/cli'

// Set CAPACITOR_SERVER_URL in your shell or CI to your Vercel deployment URL.
// e.g. export CAPACITOR_SERVER_URL=https://your-app.vercel.app
const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://YOUR_VERCEL_URL.vercel.app'

const config: CapacitorConfig = {
  appId:   'com.manifestapp.social',
  appName: 'Confirmed',

  // webDir is required by Capacitor; the actual content is served from server.url
  webDir: 'public',

  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
    backgroundColor: '#080808',
    preferredContentMode: 'mobile',
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#080808',
  },

  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080808',
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#080808',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
