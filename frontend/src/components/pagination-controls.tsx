"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationControlsProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  label: string;
  onPageChange: (page: number) => void;
};

function visiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  label,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <nav
      className="premium-card mt-5 flex flex-col gap-3 rounded-[1.15rem] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label={`${label} pagination`}
    >
      <p className="text-sm text-[var(--muted)]">
        Showing {startItem}-{endItem} of {totalItems} {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn-secondary min-h-9 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          Prev
        </button>
        {visiblePages(currentPage, totalPages).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={
              page === currentPage
                ? "min-h-9 rounded-lg border border-[var(--accent-deep)] bg-[var(--accent-deep)] px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15"
                : "btn-secondary min-h-9 px-3 py-2 text-sm"
            }
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn-secondary min-h-9 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
