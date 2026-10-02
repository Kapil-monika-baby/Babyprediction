import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Baby Prediction",
  description: "Create and share a baby prediction game.",
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
