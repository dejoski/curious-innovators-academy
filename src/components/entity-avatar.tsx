"use client";

import React from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function EntityAvatar({
  name,
  src,
  className = "size-8",
  textClassName = "text-[12px]",
}: {
  name: string;
  src?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const cleanSrc = typeof src === "string" && src.trim() ? src.trim() : "";
  const showImage = cleanSrc && !failed;

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d2f1f5] font-semibold text-[#155e66] ring-1 ring-[#bdeaf0]`}
      aria-label={name || "Profile photo"}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          src={cleanSrc}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={textClassName}>{initialsFromName(name)}</span>
      )}
    </span>
  );
}
