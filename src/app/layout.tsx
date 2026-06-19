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
      <body className="bg-surface text-on-surface font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
