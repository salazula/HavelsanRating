import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin", "latin-ext"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Havelsan Rating", template: "%s · Havelsan Rating" },
  description: "Havelsan masa tenisi rating sistemi: oyuncu sıralaması, haftalık gruplar, maç sonuçları ve istatistikler.",
  appleWebApp: { title: "Havelsan Rating", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#070b14" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${plex.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
