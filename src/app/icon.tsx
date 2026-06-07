import { ImageResponse } from "next/og";
import { BrandAppIconImageResponseRoot } from "@/lib/brand-app-icon-mark";

type IconProps = {
  width: number;
  height: number;
  cornerRadius: number;
  dot: number;
};

export function createIcon({ width, height, cornerRadius, dot }: IconProps) {
  return new ImageResponse(
    <BrandAppIconImageResponseRoot cornerRadius={cornerRadius} dot={dot} />,
    { width, height },
  );
}

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return createIcon({ width: size.width, height: size.height, cornerRadius: 8, dot: 14 });
}
