import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoloReach",
  description: "Slack 1タップで完結するSEO→X 自動展開ツール",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Noto+Serif+JP:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/image/bg01.jpg" as="image" />
      </head>
      <body>{children}</body>
    </html>
  );
}
