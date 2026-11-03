import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ISKCON Disciples Course",
    short_name: "IDC Portal",
    description:
      "Student Registration, Examination, Payment & Certificate Portal for the ISKCON Disciples Course.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#ffffff",
    theme_color: "#57101a",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["education", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icons/icon-48x48.png",
        sizes: "48x48",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Student Login",
        short_name: "Login",
        url: "/login",
        description: "Sign in to your student or staff account",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "Register",
        short_name: "Register",
        url: "/register",
        description: "Register for ISKCON Disciples Course",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "Verify Certificate",
        short_name: "Verify",
        url: "/verify",
        description: "Verify an IDC graduation certificate",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        description: "Access your courses and portal dashboard",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
    ],
  };
}
