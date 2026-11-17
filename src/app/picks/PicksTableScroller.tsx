"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function PicksTableScroller({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [maxScroll, setMaxScroll] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    function updateSize() {
      if (!scrollElement) return;
      setMaxScroll(Math.max(0, scrollElement.scrollWidth - scrollElement.clientWidth));
      setScrollPosition(scrollElement.scrollLeft);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(scrollElement);
    if (scrollElement.firstElementChild) observer.observe(scrollElement.firstElementChild);
    updateSize();
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={scrollRef}
        className="max-h-[75vh] overflow-auto rounded-lg border border-gray-800"
        role="region"
        aria-label="Everyone's picks"
        tabIndex={0}
        onScroll={(event) => setScrollPosition(event.currentTarget.scrollLeft)}
      >
        {children}
      </div>
      {maxScroll > 0 && (
        <div className="sticky bottom-0 z-20 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 shadow-lg">
          <label className="flex items-center gap-3 text-sm text-gray-200">
            <span className="shrink-0">Scroll across</span>
            <input
              type="range"
              min={0}
              max={maxScroll}
              step="any"
              value={Math.min(scrollPosition, maxScroll)}
              onChange={(event) => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft = Number(event.target.value);
                  setScrollPosition(scrollRef.current.scrollLeft);
                }
              }}
              className="w-full accent-cyan-400"
              aria-label="Scroll picks table horizontally"
            />
          </label>
        </div>
      )}
    </div>
  );
}
