import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UGS",
  description: "\"勉強だけで終わらない\" 「お金の知識×稼げる力」がコンセプトのビジネスコミュニティ",
  icons: {
    icon: '/ugs-logomark.png',
    shortcut: '/ugs-logomark.png',
    apple: '/ugs-logomark.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UGS',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-50 text-slate-900`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-slate-500">
          メインコンテンツへスキップ
        </a>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
