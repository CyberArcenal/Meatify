import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  variant?: "default" | "compact";
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
}

/** Throttle window in ms — only 1 API call per window, last click wins */
const THROTTLE_MS = 350;

const Pagination: React.FC<PaginationProps> = ({
  variant = "default",
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Throttle / Optimistic UI State ────────────────────────────
  // `displayPage` gives instant visual feedback while the real
  // `onPageChange` call is being throttled.
  const [displayPage, setDisplayPage] = useState(currentPage);
  const lastFiredRef = useRef<number>(currentPage);
  const throttleUntilRef = useRef<number>(0);
  const pendingPageRef = useRef<number | null>(null);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest onPageChange in a ref to avoid stale closures
  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  // Ref for the recursive trailing-edge call
  const handlePageChangeRef = useRef<(page: number) => void>(() => {});

  // Sync optimistic state when the "real" page changes externally
  // (e.g. data reloaded, filters reset, page size changed, etc.)
  useEffect(() => {
    if (pendingPageRef.current === null && releaseTimerRef.current === null) {
      lastFiredRef.current = currentPage;
      setDisplayPage(currentPage);
    }
  }, [currentPage]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    };
  }, []);

  // ─── Throttled Page Change ─────────────────────────────────────
  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;

      // Skip if nothing actually changed
      if (page === lastFiredRef.current && pendingPageRef.current === null) {
        return;
      }

      // Instant UI feedback — active button updates right away
      setDisplayPage(page);

      const now = Date.now();
      if (now < throttleUntilRef.current) {
        // Inside throttle window — remember the LATEST requested page only
        pendingPageRef.current = page;
        return;
      }

      // Leading edge — fire immediately
      lastFiredRef.current = page;
      throttleUntilRef.current = now + THROTTLE_MS;
      onPageChangeRef.current(page);

      setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

      // Trailing edge — after window, fire the last pending page (if any)
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = setTimeout(() => {
        releaseTimerRef.current = null;
        throttleUntilRef.current = 0;

        const pending = pendingPageRef.current;
        pendingPageRef.current = null;

        if (pending !== null && pending !== lastFiredRef.current) {
          handlePageChangeRef.current(pending);
        }
      }, THROTTLE_MS);
    },
    [totalPages],
  );

  // Keep the recursive ref in sync
  useEffect(() => {
    handlePageChangeRef.current = handlePageChange;
  }, [handlePageChange]);

  // ─── Page Size Change (also resets throttle) ───────────────────
  const handlePageSizeChange = useCallback(
    (size: number) => {
      if (!onPageSizeChange) return;
      // Reset throttle state — semantics change when page size changes
      if (releaseTimerRef.current) {
        clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      throttleUntilRef.current = 0;
      pendingPageRef.current = null;
      onPageSizeChange(size);
    },
    [onPageSizeChange],
  );

  // ─── Page Number Window ────────────────────────────────────────
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (displayPage <= half + 1) {
        for (let i = 1; i <= maxVisible - 2; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (displayPage >= totalPages - half) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (maxVisible - 3); i <= totalPages; i++)
          pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = displayPage - 1; i <= displayPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1 && !showPageSize) return null;

  const wrapperClasses =
    variant === "compact"
      ? "flex flex-col sm:flex-row items-center justify-between gap-4"
      : "flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 px-2 py-3 bg-[var(--card-bg)] border border-[var(--border-color)]/20 rounded-lg";

  return (
    <div ref={containerRef} className={wrapperClasses}>
      {/* Items info */}
      <div className="text-sm text-[var(--text-secondary)] order-2 sm:order-1">
        Showing{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {startItem}
        </span>{" "}
        to{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {endItem}
        </span>{" "}
        of{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {totalItems}
        </span>{" "}
        items
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={displayPage === 1}
          className="p-2 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-color)]/20 
                     text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePageChange(displayPage - 1)}
          disabled={displayPage === 1}
          className="p-2 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-color)]/20 
                     text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className="px-3 py-2 text-[var(--text-tertiary)]">...</span>
            ) : (
              <button
                onClick={() => handlePageChange(page as number)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    displayPage === page
                      ? "bg-[var(--primary-color)] text-black shadow-md"
                      : "bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] border border-[var(--border-color)]/20"
                  }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => handlePageChange(displayPage + 1)}
          disabled={displayPage === totalPages}
          className="p-2 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-color)]/20 
                     text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={displayPage === totalPages}
          className="p-2 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-color)]/20 
                     text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Page size selector */}
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2 order-3">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-[var(--card-secondary-bg)] border border-[var(--border-color)]/20 
                       text-[var(--text-primary)] text-sm focus:border-[var(--primary-color)] focus:ring-1 
                       focus:ring-[var(--primary-color)]/50"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default Pagination;