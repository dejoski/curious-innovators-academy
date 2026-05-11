import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folders may contain other lockfiles; pin the Turbopack workspace root so
  // `.next` output and manifests stay inside this package (avoids ENOENT during build).
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
