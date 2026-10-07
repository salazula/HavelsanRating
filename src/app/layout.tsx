import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "latin-ext"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Masa Tenisi Rating", template: "%s · Masa Tenisi Rating" },
  description: "Masa tenisi rating sistemi: oyuncu sıralaması, haftalık gruplar, maç sonuçları ve istatistikler.",
  appleWebApp: { title: "MT Rating", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#110c33" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${manrope.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
