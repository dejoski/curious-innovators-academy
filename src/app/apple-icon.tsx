import { createIcon } from "./icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return createIcon({ width: size.width, height: size.height, cornerRadius: 44, dot: 79 });
}
