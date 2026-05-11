"use client";

import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

export type FixedMenuPlacement = { top: number; left: number };

/**
 * Anchors dropdown content with position:fixed so menus are not clipped by
 * ancestor overflow-x-auto / overflow-hidden (popover remains aligned to the anchor).
 */
export function useFixedMenuPlacement(
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  menuWidth = 160,
): FixedMenuPlacement | null {
  const [placement, setPlacement] = useState<FixedMenuPlacement | null>(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) {
      setPlacement(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    let left = rect.right - menuWidth;
    const maxLeft = window.innerWidth - menuWidth - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    setPlacement({
      top: rect.bottom + 4,
      left,
    });
  }, [anchorRef, menuWidth]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, update]);

  if (!isOpen) return null;
  return placement;
}
