"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import type {
  Preferences,
  TableDensity,
  ThemePref,
  ViewMode,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";

const THEMES: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

function OptionCard({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:border-border-strong hover:bg-accent/40",
      )}
    >
      <Icon
        name={icon}
        size={22}
        className={active ? "text-primary" : "text-muted-foreground"}
      />
      <span
        className={cn(
          "text-[13px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {active && (
        <Icon name="check-circle" size={15} className="text-primary" />
      )}
    </button>
  );
}

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  useEffect(() => {
    api.settings.getPreferences().then(setPrefs);
  }, []);

  const update = async (patch: Partial<Preferences>) => {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    await api.settings.updatePreferences(patch);
    toast.success("Preferences updated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <OptionCard
                key={t.value}
                active={theme === t.value}
                label={t.label}
                icon={t.icon}
                onClick={() => setTheme(t.value)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table density</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(["comfortable", "compact"] as TableDensity[]).map((d) => (
              <OptionCard
                key={d}
                active={prefs?.density === d}
                label={d === "comfortable" ? "Comfortable" : "Compact"}
                icon={d === "comfortable" ? "list" : "menu"}
                onClick={() => update({ density: d })}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default workflow view</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(["grid", "list"] as ViewMode[]).map((v) => (
              <OptionCard
                key={v}
                active={prefs?.defaultView === v}
                label={v === "grid" ? "Grid" : "List"}
                icon={v === "grid" ? "grid" : "list"}
                onClick={() => update({ defaultView: v })}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[13.5px] font-medium text-foreground">
                Interface animations
              </p>
              <p className="text-[13px] text-muted-foreground">
                Subtle transitions across the app.
              </p>
            </div>
            <Switch
              checked={prefs?.accentAnimations ?? true}
              onChange={(v) => update({ accentAnimations: v })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
