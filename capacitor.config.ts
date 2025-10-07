import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.judgefinder.ios',
  appName: 'JudgeFinder',
  webDir: 'public',
  // Note: server.url removed to allow local index.html to load
  // The index.html (ios-loader.html) will load the production site via iframe
  ios: {
    contentInset: 'automatic',
    scheme: 'JudgeFinder',
    // Handle external links with SFSafariViewController
    allowsLinkPreview: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1f2937',
      showSpinner: false
    }
  }
};

export default config;
