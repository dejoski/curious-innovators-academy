import { useEffect, useRef, type RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
  handler: () => void,
  enabled = true,
) {
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    const refs = Array.isArray(ref) ? ref : [ref];
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (refs.some((r) => r.current?.contains(target))) return;
      saved.current();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [ref, enabled]);
}
