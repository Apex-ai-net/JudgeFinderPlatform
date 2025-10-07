import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.judgefinder.ios',
  appName: 'JudgeFinder',
  webDir: '.next',
  server: {
    // Production URL - will load the live site
    url: 'https://olms-4375-tw501-x421.netlify.app',
    cleartext: false
  },
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
