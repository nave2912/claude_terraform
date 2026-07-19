import { useEffect, useRef, useState } from "react";

/** Auto-scrolls to bottom on new content unless the user has scrolled up
 * to read history — in which case a ScrollButton should appear instead of
 * yanking them back down. */
export function useAutoScroll<T>(dependency: T) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsAtBottom(distanceFromBottom < 80);
  }

  function scrollToBottom() {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
    setIsAtBottom(true);
  }

  return { containerRef, isAtBottom, handleScroll, scrollToBottom };
}
