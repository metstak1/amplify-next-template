// app/layout.tsx
import "@aws-amplify/ui-react/styles.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import ConfigureAmplifyClientSide from "@/components/ConfigureAmplify";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: "Amplify Todo App",
    template: "%s | Amplify Todo App"
  },
  description: "A modern todo application built with AWS Amplify, Next.js, and Tailwind CSS",
  keywords: ["todo", "productivity", "amplify", "nextjs", "react"],
  authors: [{ name: "Your Organization" }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ConfigureAmplifyClientSide />
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col bg-background">
            <div className="flex-1">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}