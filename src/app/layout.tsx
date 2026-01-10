import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/providers/PostHogProvider";
import PostHogPageView from "@/components/posthog-pageview";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PixelPinch - Free Batch Image Compression",
  description: "Instantly compress all your images at once, entirely in your browser. No uploads, no limits, private. Supports WebP, JPEG, PNG, and HEIC.",
  keywords: ["image compression", "batch compress", "webp", "jpeg", "png", "heic", "browser", "privacy", "free", "online", "fast", "instant"],

  // Canonical URL
  metadataBase: new URL('https://pixelpinch.app'),
  alternates: {
    canonical: '/',
  },

  // Open Graph
  openGraph: {
    title: 'PixelPinch - Free Batch Image Compression',
    description: 'Instantly compress all your images in your browser. No uploads, no limits, private.',
    url: 'https://pixelpinch.app',
    siteName: 'PixelPinch',
    locale: 'en_US',
    type: 'website',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'PixelPinch - Batch Image Compression'
    }],
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'PixelPinch - Free Batch Image Compression',
    description: 'Instantly compress all your images in your browser. No limits, private.',
    images: ['/og-image.png'],
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  // Icons & Manifest
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',

  // Other
  authors: [{ name: 'Louis', url: 'https://bylouis.io' }],
  creator: 'Louis',
  publisher: 'Louis',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
