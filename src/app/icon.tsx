import { ImageResponse } from "next/og";
import { BrandAppIconImageResponseRoot } from "@/lib/brand-app-icon-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <BrandAppIconImageResponseRoot cornerRadius={8} dot={14} />,
    { ...size },
  );
}
