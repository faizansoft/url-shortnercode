import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
<<<<<<< HEAD
  preload: false, // avoid preloaded-but-not-used warnings
  display: 'swap',
=======
>>>>>>> 0e1f9ed (Initial commit)
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
<<<<<<< HEAD
  preload: false,
  display: 'swap',
=======
>>>>>>> 0e1f9ed (Initial commit)
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
<<<<<<< HEAD
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const withProto = /^https?:\/\//i.test(raw) ? raw : (raw ? `https://${raw}` : '');
  const supabaseOrigin = (() => {
    try { return withProto ? new URL(withProto).origin : ''; } catch { return ''; }
  })();
=======
>>>>>>> 0e1f9ed (Initial commit)
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
<<<<<<< HEAD
        {/* Performance hints for Supabase assets (thumbnails, logos) */}
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
=======
>>>>>>> 0e1f9ed (Initial commit)
        {children}
      </body>
    </html>
  );
}
