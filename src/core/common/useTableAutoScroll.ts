import { useEffect, useRef } from "react";

/**
 * Custom hook that automatically scrolls a horizontally scrollable table
 * when the mouse cursor approaches the left or right edges of the table container.
 */
export const useTableAutoScroll = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scrollSpeedRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Helper to find the horizontally scrollable child element inside Ant Table
    const getScrollElement = (): HTMLElement | null => {
      const selectors = [
        ".ant-table-content",
        ".ant-table-body",
        ".ant-table-container",
        ".table-responsive"
      ];
      for (const sel of selectors) {
        const el = container.querySelector(sel) as HTMLElement | null;
        if (el && el.scrollWidth > el.clientWidth) {
          return el;
        }
      }
      if (container.scrollWidth > container.clientWidth) {
        return container;
      }
      return (container.querySelector(".ant-table-content") ||
        container.querySelector(".ant-table-container")) as HTMLElement | null;
    };

    const stopScrolling = () => {
      scrollSpeedRef.current = 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };

    const stepScroll = () => {
      const scrollEl = getScrollElement();
      if (!scrollEl || scrollSpeedRef.current === 0) {
        stopScrolling();
        return;
      }

      const prevScroll = scrollEl.scrollLeft;
      scrollEl.scrollLeft += scrollSpeedRef.current;

      // Stop if reached the ends and didn't move
      if (scrollEl.scrollLeft === prevScroll) {
        stopScrolling();
        return;
      }

      animFrameRef.current = requestAnimationFrame(stepScroll);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const scrollEl = getScrollElement();
      if (!scrollEl) {
        stopScrolling();
        return;
      }

      // Check if the element has horizontal overflow
      if (scrollEl.scrollWidth <= scrollEl.clientWidth) {
        stopScrolling();
        return;
      }

      const rect = scrollEl.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Verify mouse is vertically within the table
      if (mouseY < rect.top || mouseY > rect.bottom) {
        stopScrolling();
        return;
      }

      const edgeThreshold = 95; // px zone from edge to trigger auto-scroll
      const maxSpeed = 18; // maximum scroll speed px per frame

      const distFromLeft = mouseX - rect.left;
      const distFromRight = rect.right - mouseX;

      if (distFromLeft >= 0 && distFromLeft <= edgeThreshold) {
        // Near left edge -> scroll left (negative speed)
        const intensity = 1 - distFromLeft / edgeThreshold;
        scrollSpeedRef.current = -Math.max(2, Math.round(intensity * maxSpeed));

        if (!animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(stepScroll);
        }
      } else if (distFromRight >= 0 && distFromRight <= edgeThreshold) {
        // Near right edge -> scroll right (positive speed)
        const intensity = 1 - distFromRight / edgeThreshold;
        scrollSpeedRef.current = Math.max(2, Math.round(intensity * maxSpeed));

        if (!animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(stepScroll);
        }
      } else {
        stopScrolling();
      }
    };

    const handleMouseLeave = () => {
      stopScrolling();
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      stopScrolling();
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return containerRef;
};

export default useTableAutoScroll;
