"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Portal } from "@/components/ui/portal";
import { Spinner } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    api.settings.getPreferences().then((p) => setCollapsed(p.sidebarCollapsed));
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      api.settings.updatePreferences({ sidebarCollapsed: next });
      return next;
    });
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={22} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden shrink-0 lg:flex">
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* Mobile off-canvas sidebar */}
        {mobileOpen && (
          <Portal>
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={() => setMobileOpen(false)}
              />
              <div className="animate-slide-in-right absolute left-0 top-0 h-full">
                <Sidebar
                  collapsed={false}
                  onToggleCollapse={() => {}}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </div>
          </Portal>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
          <main className="scrollbar-thin flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
