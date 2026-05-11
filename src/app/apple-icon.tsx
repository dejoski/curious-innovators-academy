import { ImageResponse } from "next/og";
import { BrandAppIconImageResponseRoot } from "@/lib/brand-app-icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <BrandAppIconImageResponseRoot cornerRadius={44} dot={79} />,
    { ...size },
  );
}
