"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ROUTE_TITLES } from "@/lib/nav";

const ID_PREFIXES = ["wf_", "exec_", "int_", "tpl_", "var_", "key_", "node_"];

function labelFor(segment: string): string {
  if (ROUTE_TITLES[segment]) return ROUTE_TITLES[segment];
  if (ID_PREFIXES.some((p) => segment.startsWith(p))) return "Details";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: labelFor(seg),
    href: `/${segments.slice(0, i + 1).join("/")}`,
    last: i === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-[13px]"
    >
      {crumbs.map((c, i) => (
        <div key={c.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && (
            <Icon
              name="chevron-right"
              size={14}
              className="shrink-0 text-muted-foreground/60"
            />
          )}
          {c.last ? (
            <span className="truncate font-medium text-foreground">
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              {c.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
