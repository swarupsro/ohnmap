"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PaginationControls({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const setPage = (nextPage) => onPageChange(Math.min(Math.max(1, nextPage), pageCount));

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/10 px-4 py-3 text-sm xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          Showing {start}-{end} of {total}
        </span>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Rows
          <select
            value={pageSize}
            onChange={(event) => {
              onPageSizeChange(Number(event.target.value));
              onPageChange(1);
            }}
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-ring"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-8 min-w-20 items-center justify-center rounded-lg border bg-background px-3 font-mono text-xs">
            {page}/{pageCount}
          </div>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage(pageCount)} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
