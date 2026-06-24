import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Using local Geist variable font (ships with create-next-app)
// as the primary display font for offline/intranet builds.
// CSS var --font-sans is applied via Tailwind fontFamily.sans.
// Inter (from DESIGN.md) degrades to system-ui in environments
// where the Google Fonts network is unavailable (institutional TLS proxy).
const displayFont = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adquisiciones TIC — INEI / OTIN",
  description: "Sistema de seguimiento de adquisiciones TIC institucionales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={displayFont.variable} suppressHydrationWarning>
      <head>
        {/* Tipografías institucionales (Syne / Inter / JetBrains Mono).
            Degradan a la fuente local si el proxy TLS del INEI las bloquea. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
