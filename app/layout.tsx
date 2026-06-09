import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Gym Tracker",
  description: "JLord's personal gym tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0b09",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col text-white antialiased">
        <ThemeProvider>
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
