"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="scrollbar-thin w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-muted/60 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} {...props} />
  );
}

export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors", className)} {...props} />;
}

interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDir?: "asc" | "desc" | null;
  onSort?: () => void;
}

export function TH({
  className,
  sortable,
  sortDir,
  onSort,
  children,
  ...props
}: THProps) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border px-4 py-2.5 text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          {children}
          <Icon
            name={
              sortDir === "asc"
                ? "chevron-up"
                : sortDir === "desc"
                  ? "chevron-down"
                  : "arrow-up-down"
            }
            size={13}
            className={cn(sortDir ? "text-foreground" : "opacity-50")}
          />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TD({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-4 py-3 align-middle text-foreground",
        className,
      )}
      {...props}
    />
  );
}
