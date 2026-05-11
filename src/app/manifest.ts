import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Curious Innovators Academy",
    short_name: "CIA",
    description:
      "School dashboard for Curious Innovators Academy — sign in for classes, students, and family tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#05080b",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
