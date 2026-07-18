import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  match?: (path: string) => boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "layout-dashboard" },
      {
        label: "Workflows",
        href: "/workflows",
        icon: "workflow",
        match: (p) => p.startsWith("/workflows") || p.startsWith("/builder"),
      },
      { label: "Executions", href: "/executions", icon: "play" },
      { label: "Templates", href: "/templates", icon: "layout-template" },
    ],
  },
  {
    label: "Connect",
    items: [
      { label: "Integrations", href: "/integrations", icon: "plug" },
      { label: "Variables", href: "/variables", icon: "braces" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Activity", href: "/activity", icon: "activity" },
      { label: "Notifications", href: "/notifications", icon: "bell" },
    ],
  },
];

export const SETTINGS_NAV: NavItem[] = [
  { label: "Profile", href: "/settings/profile", icon: "user" },
  { label: "Account", href: "/settings/account", icon: "settings" },
  { label: "Appearance", href: "/settings/appearance", icon: "sun" },
  { label: "API Keys", href: "/settings/api-keys", icon: "key" },
  { label: "AI providers", href: "/settings/ai-providers", icon: "sparkles" },
  { label: "Security", href: "/settings/security", icon: "shield" },
  { label: "Sessions", href: "/settings/sessions", icon: "monitor" },
];

/** Human label for a top-level route segment (breadcrumbs / titles). */
export const ROUTE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  workflows: "Workflows",
  builder: "Workflow Builder",
  executions: "Executions",
  templates: "Templates",
  integrations: "Integrations",
  variables: "Variables",
  activity: "Activity",
  notifications: "Notifications",
  settings: "Settings",
  profile: "Profile",
  account: "Account",
  appearance: "Appearance",
  "api-keys": "API Keys",
  security: "Security",
  sessions: "Sessions",
};
