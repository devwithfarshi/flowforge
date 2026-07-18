"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { Breadcrumbs } from "./breadcrumbs";
import { useCommandPalette } from "./command-palette";
import { NotificationsMenu } from "./notifications-menu";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const palette = useCommandPalette();

  const cycleTheme = () =>
    setTheme(resolvedTheme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Icon name="menu" size={20} />
      </button>

      <Badge tone="purple" className="shrink-0 lg:hidden">
        Demo Mode
      </Badge>

      <div className="hidden min-w-0 flex-1 md:block">
        <Breadcrumbs />
      </div>

      {/* Search trigger */}
      <button
        type="button"
        onClick={palette.open}
        className="group ml-auto flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong md:ml-0 md:w-64 md:justify-between lg:w-72"
      >
        <span className="flex items-center gap-2">
          <Icon name="search" size={16} />
          <span className="hidden md:inline">Search…</span>
        </span>
        <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline-flex">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-0.5 md:ml-auto">
        <button
          type="button"
          onClick={cycleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Icon name={resolvedTheme === "dark" ? "sun" : "moon"} size={19} />
        </button>

        <NotificationsMenu />

        <Dropdown
          align="end"
          width={240}
          trigger={
            <button
              type="button"
              className="ml-1 flex items-center gap-2 rounded-md p-0.5 transition-colors hover:bg-accent"
              aria-label="Account menu"
            >
              <Avatar
                name={user?.name ?? "User"}
                color={user?.avatarColor}
                size={30}
              />
            </button>
          }
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {user?.name}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <DropdownSeparator />
          <Link href="/settings/profile">
            <DropdownItem icon="user">Profile</DropdownItem>
          </Link>
          <Link href="/settings/account">
            <DropdownItem icon="settings">Account settings</DropdownItem>
          </Link>
          <Link href="/settings/api-keys">
            <DropdownItem icon="key">API keys</DropdownItem>
          </Link>
          <DropdownSeparator />
          <DropdownLabel>Theme</DropdownLabel>
          <DropdownItem icon="sun" onSelect={() => setTheme("light")}>
            Light{theme === "light" ? "  ✓" : ""}
          </DropdownItem>
          <DropdownItem icon="moon" onSelect={() => setTheme("dark")}>
            Dark{theme === "dark" ? "  ✓" : ""}
          </DropdownItem>
          <DropdownItem icon="monitor" onSelect={() => setTheme("system")}>
            System{theme === "system" ? "  ✓" : ""}
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon="log-out" destructive onSelect={logout}>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
