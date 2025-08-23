import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false, // avoid preloaded-but-not-used warnings
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
  display: 'swap',
});

export const metadata: Metadata = {
  title: "URL Shortner",
  description: "Shorten URLs, generate QR codes, and view analytics",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const withProto = /^https?:\/\//i.test(raw) ? raw : (raw ? `https://${raw}` : '');
  const supabaseOrigin = (() => {
    try { return withProto ? new URL(withProto).origin : ''; } catch { return ''; }
  })();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Performance hints for Supabase assets (thumbnails, logos) */}
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
