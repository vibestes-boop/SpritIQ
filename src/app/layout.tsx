import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpritIQ — KI-Spritpreise in Deutschland",
  description:
    "SpritIQ zeigt dir nicht nur Spritpreise — es erklärt WARUM, WOHIN und WANN du tanken solltest. KI-gestützte Analyse, Echtzeit-Preise und Spracheingabe.",
  keywords: [
    "Spritpreise",
    "Benzinpreise",
    "Diesel",
    "Tankstellen",
    "KI",
    "Deutschland",
  ],
  authors: [{ name: "SpritIQ" }],
  openGraph: {
    title: "SpritIQ — KI-Spritpreise",
    description:
      "Die erste deutsche Spritpreis-App die erklärt, analysiert und vorhersagt.",
    type: "website",
    locale: "de_DE",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpritIQ",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
