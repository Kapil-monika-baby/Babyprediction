import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Baby Prediction",
  description: "Create and share a baby prediction game.",
  applicationName: "Baby Prediction",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Baby Prediction",
  },
  icons: {
    icon: "/icons/baby-prediction.svg",
    apple: "/icons/baby-prediction.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#fffaf7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
