import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import StructuredData from "@/components/StructuredData";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "Akmalaka - Yog'och Import/Export Boshqaruv Tizimi",
    template: "%s | Akmalaka"
  },
  description: "Rossiyadan yog'och import va export boshqaruv tizimi. Vagon sotuvlari, mijozlar, xarajatlar va moliyaviy hisobotlarni boshqarish. Wood import/export management system from Russia. Управление импортом и экспортом древесины из России.",
  keywords: [
    "yog'och import",
    "yog'och export", 
    "wood import",
    "wood export",
    "древесина импорт",
    "древесина экспорт",
    "vagon sotuvlari",
    "wagon sales",
    "продажа вагонов",
    "rossiya yog'och",
    "russia wood",
    "россия древесина",
    "o'zbekiston yog'och",
    "uzbekistan wood",
    "узбекистан древесина",
    "yog'och boshqaruv tizimi",
    "wood management system",
    "система управления древесиной",
    "akmalaka",
    "biznejon"
  ],
  authors: [{ name: "Akmalaka" }],
  creator: "Akmalaka",
  publisher: "Akmalaka",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    alternateLocale: ['ru_RU', 'en_US'],
    url: 'https://akmalaka.biznejon.uz',
    siteName: 'Akmalaka',
    title: "Akmalaka - Yog'och Import/Export Boshqaruv Tizimi",
    description: "Rossiyadan yog'och import va export boshqaruv tizimi. Vagon sotuvlari, mijozlar, xarajatlar va moliyaviy hisobotlarni boshqarish.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Akmalaka - Wood Import/Export Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Akmalaka - Yog'och Import/Export Boshqaruv Tizimi",
    description: "Rossiyadan yog'och import va export boshqaruv tizimi",
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://akmalaka.biznejon.uz',
    languages: {
      'uz': 'https://akmalaka.biznejon.uz',
      'ru': 'https://akmalaka.biznejon.uz',
      'en': 'https://akmalaka.biznejon.uz',
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <head>
        <link rel="canonical" href="https://akmalaka.biznejon.uz" />
        <meta name="google-site-verification" content="your-verification-code" />
      </head>
      <body className="antialiased">
        <StructuredData />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
