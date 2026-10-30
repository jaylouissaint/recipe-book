import type { MetadataRoute } from "next";

// What a phone or iPad uses for the Home Screen shortcut: the name, the whisk-and-spoon icon, and
// opening full screen like an app (no address bar; the site's own tabs and back buttons get around).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ramiya’s Recipes",
    short_name: "Ramiya’s Recipes",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#fbf8f2",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
