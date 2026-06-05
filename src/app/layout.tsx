import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const APP_DESCRIPTION =
  "School hub for Curious Innovators Academy — roster, classes, schedules, and family-facing tools.";

export const metadata: Metadata = {
  applicationName: "Curious Innovators Academy",
  title: {
    default: "Curious Innovators Academy",
    template: "%s · Curious Innovators Academy",
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    title: "Curious Innovators Academy",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#05080b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased font-sans`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
