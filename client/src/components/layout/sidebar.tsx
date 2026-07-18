"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { NAV, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);

  const createWorkflow = async () => {
    setCreating(true);
    try {
      const wf = await api.workflows.create();
      toast.success("Workflow created");
      onNavigate?.();
      router.push(`/builder/${wf.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {collapsed ? (
          <Tooltip content="Demo Mode" side="bottom">
            <Link
              href="/dashboard"
              onClick={onNavigate}
              aria-label="Flowforge (Demo Mode)"
              className="relative"
            >
              <LogoMark size={28} />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-sidebar" />
            </Link>
          </Tooltip>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <Link href="/dashboard" onClick={onNavigate} className="shrink-0">
                <Logo size={26} />
              </Link>
              <Badge tone="purple" className="shrink-0">
                Demo Mode
              </Badge>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground lg:block"
              aria-label="Collapse sidebar"
            >
              <Icon name="chevrons-left" size={18} />
            </button>
          </>
        )}
      </div>

      {/* New workflow */}
      <div className={cn("px-3 pt-3", collapsed && "px-2")}>
        <Tooltip content={collapsed ? "New workflow" : ""} side="bottom">
          <button
            type="button"
            onClick={createWorkflow}
            disabled={creating}
            className={cn(
              "flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60",
              collapsed && "px-0",
            )}
          >
            {creating ? <Spinner size={16} /> : <Icon name="plus" size={17} />}
            {!collapsed && "New workflow"}
          </button>
        </Tooltip>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin mt-3 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV.map((section, i) => (
          <div key={i}>
            {section.label && !collapsed && (
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {section.label}
              </p>
            )}
            {section.label && collapsed && i > 0 && (
              <div className="mx-2 mb-2 h-px bg-sidebar-border" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item, pathname);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-sidebar-active text-sidebar-active-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip content={item.label} side="bottom">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-sidebar-border p-3",
          collapsed && "px-2",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Tooltip content="Settings" side="bottom">
              <Link
                href="/settings/profile"
                onClick={onNavigate}
                className="flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <Icon name="settings" size={18} />
              </Link>
            </Tooltip>
            <Tooltip content="Expand" side="bottom">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Expand sidebar"
              >
                <Icon name="chevrons-right" size={18} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <Link
            href="/settings/profile"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-sidebar-active text-sidebar-active-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon name="settings" size={18} />
            Settings
          </Link>
        )}
      </div>
    </aside>
  );
}
