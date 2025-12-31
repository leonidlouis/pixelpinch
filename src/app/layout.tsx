import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  description: "Instantly compress 50+ images at once, entirely in your browser. No uploads, no servers. Supports WebP, JPEG, PNG, and HEIC. 100% private.",
  keywords: ["image compression", "batch compress", "webp", "jpeg", "png", "heic", "browser", "privacy", "free", "online", "fast", "instant"],

  // Canonical URL
  metadataBase: new URL('https://pixelpinch.app'),
  alternates: {
    canonical: '/',
  },

  // Open Graph
  openGraph: {
    title: 'PixelPinch - Free Batch Image Compression',
    description: 'Instantly compress 50+ images in your browser. No uploads, 100% private.',
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
    description: 'Instantly compress 50+ images in your browser. 100% private.',
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
  authors: [{ name: 'Louis', url: 'https://bylouis.dev' }],
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
        {children}
      </body>
    </html>
  );
}
