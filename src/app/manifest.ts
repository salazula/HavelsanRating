import type { MetadataRoute } from "next";

/** Ana ekrana eklenince uygulama gibi (adres çubuğu olmadan) açılması için */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Havelsan Rating",
    short_name: "Havelsan Rating",
    description: "Havelsan masa tenisi rating sistemi",
    start_url: "/panel",
    display: "standalone",
    background_color: "#0a1f42",
    theme_color: "#0a1f42",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
