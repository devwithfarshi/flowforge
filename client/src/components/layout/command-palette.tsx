"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { Portal, useBodyScrollLock } from "@/components/ui/portal";
import { useEscapeKey } from "@/hooks/use-click-outside";
import { api } from "@/lib/api";
import { NAV, SETTINGS_NAV } from "@/lib/nav";
import type { Workflow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  icon: IconName;
  group: string;
  keywords?: string;
  run: () => void;
}

const CommandCtx = createContext<{ open: () => void } | null>(null);

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const { setTheme, resolvedTheme } = useTheme();

  const open = () => setIsOpen(true);
  const close = () => {
    setIsOpen(false);
    setQuery("");
    setIndex(0);
  };

  useBodyScrollLock(isOpen);
  useEscapeKey(close, isOpen);

  // Global Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isOpen) {
      api.workflows.list({ pageSize: 100 }).then((r) => setWorkflows(r.items));
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      close();
      router.push(href);
    };
    const nav: Command[] = NAV.flatMap((s) => s.items).map((i) => ({
      id: `nav-${i.href}`,
      label: i.label,
      icon: i.icon,
      group: "Navigation",
      run: go(i.href),
    }));
    const settings: Command[] = SETTINGS_NAV.map((i) => ({
      id: `set-${i.href}`,
      label: i.label,
      sublabel: "Settings",
      icon: i.icon,
      group: "Settings",
      run: go(i.href),
    }));
    const actions: Command[] = [
      {
        id: "new-workflow",
        label: "Create new workflow",
        icon: "plus",
        group: "Actions",
        run: async () => {
          close();
          const wf = await api.workflows.create();
          toast.success("Workflow created");
          router.push(`/builder/${wf.id}`);
        },
      },
      {
        id: "toggle-theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        icon: resolvedTheme === "dark" ? "sun" : "moon",
        group: "Actions",
        run: () => {
          setTheme(resolvedTheme === "dark" ? "light" : "dark");
          close();
        },
      },
    ];
    const wf: Command[] = workflows.map((w) => ({
      id: `wf-${w.id}`,
      label: w.name,
      sublabel: "Workflow",
      icon: "workflow",
      group: "Workflows",
      keywords: w.tags.join(" "),
      run: go(`/workflows/${w.id}`),
    }));
    return [...actions, ...nav, ...settings, ...wf];
  }, [workflows, resolvedTheme, router, setTheme, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q)
      return commands
        .filter((c) => c.group !== "Workflows")
        .concat(commands.filter((c) => c.group === "Workflows").slice(0, 4));
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.sublabel?.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    });
    return map;
  }, [filtered]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[index]?.run();
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  let flatIdx = -1;

  return (
    <CommandCtx.Provider value={{ open }}>
      {children}
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
            <div
              className="animate-fade-in fixed inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={close}
            />
            <div className="animate-scale-in relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Icon
                  name="search"
                  size={18}
                  className="text-muted-foreground"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search workflows, actions, settings…"
                  className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>
              <div
                ref={listRef}
                className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2"
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No results for “{query}”
                  </p>
                ) : (
                  [...grouped.entries()].map(([group, items]) => (
                    <div key={group} className="mb-1">
                      <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                        {group}
                      </p>
                      {items.map((c) => {
                        flatIdx++;
                        const active = flatIdx === index;
                        const my = flatIdx;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            data-idx={my}
                            onMouseMove={() => setIndex(my)}
                            onClick={() => c.run()}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                              active
                                ? "bg-accent text-foreground"
                                : "text-foreground/90",
                            )}
                          >
                            <Icon
                              name={c.icon}
                              size={16}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span className="flex-1 truncate font-medium">
                              {c.label}
                            </span>
                            {c.sublabel && (
                              <span className="text-[11px] text-muted-foreground">
                                {c.sublabel}
                              </span>
                            )}
                            {active && (
                              <Icon
                                name="arrow-right"
                                size={14}
                                className="text-muted-foreground"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </CommandCtx.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(CommandCtx);
  if (!ctx)
    throw new Error(
      "useCommandPalette must be used within CommandPaletteProvider",
    );
  return ctx;
}
