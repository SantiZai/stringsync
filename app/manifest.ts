import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/pedidos",
    display: "standalone",
    background_color: "#f7faf8",
    theme_color: "#2a9461",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}