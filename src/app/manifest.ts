import type { MetadataRoute } from "next";

/** Ana ekrana eklenince uygulama gibi (adres çubuğu olmadan) açılması için */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masa Tenisi Rating",
    short_name: "MT Rating",
    description: "Masa tenisi rating sistemi",
    start_url: "/panel",
    display: "standalone",
    background_color: "#110c33",
    theme_color: "#110c33",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
