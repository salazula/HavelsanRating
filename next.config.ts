import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telegram grup görseli (src/lib/group-image.tsx) yazı tiplerini çalışma anında diskten okur
  outputFileTracingIncludes: { "/**": ["./assets/fonts/*.ttf"] },
  experimental: {
    // Fotoğraflar tarayıcıda küçültülüp yüklenir (Vercel sınırı 4.5 MB)
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
