import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.monobank.game',
    appName: 'MonoBank',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // Allow cleartext for local WiFi connections
        cleartext: true
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#0c1220',
            showSpinner: false,
            androidScaleType: 'CENTER_CROP',
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#0c1220'
        }
    },
    android: {
        allowMixedContent: true // Allow HTTP for local WiFi server
    }
};

export default config;
