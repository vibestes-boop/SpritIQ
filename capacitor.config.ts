import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.spritiq.app",
  appName: "SpritIQ",
  // webDir ist der Build-Output — für Vercel-Live-Mode nutzen wir server.url
  webDir: "out",
  // ── Vercel Live Server (nach Deploy eintragen) ────────────────────────────
  // Solange kein Vercel-URL vorhanden: localhost für Development
  server: {
    url: "https://sprit-iq.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0A0A0F",
      showSpinner: false,
      androidSplashResourceName: "splash",
      splashFullScreen: true,
      splashImmersive: true,
    },
    Geolocation: {
      // Nutzt native GPS statt Browser-API — genauer und schneller
    },
  },
  android: {
    buildOptions: {
      releaseType: "APK",
    },
  },
};

export default config;
