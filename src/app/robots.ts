import type { MetadataRoute } from "next";

/** Şirket içi uygulama: arama motorlarında listelenmesin */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
