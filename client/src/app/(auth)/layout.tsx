"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Icon, type IconName } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";

const HIGHLIGHTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "workflow",
    title: "Visual workflow builder",
    body: "Compose AI automations on an infinite canvas — no code required.",
  },
  {
    icon: "sparkles",
    title: "50+ AI & integration nodes",
    body: "LLMs, RAG, documents, vision, databases, and messaging in one place.",
  },
  {
    icon: "shield-check",
    title: "Enterprise-ready",
    body: "Audit trails, granular access, secrets management, and SSO.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isVerify = pathname === "/verify-email";

  useEffect(() => {
    if (loading) return;
    if (user && !isVerify) router.replace("/dashboard");
    if (!user && isVerify) router.replace("/login");
  }, [loading, user, isVerify, router]);

  // On verify-email we keep a logged-in user; elsewhere we bounce them to the app.
  if (loading || (user && !isVerify) || (!user && isVerify)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={22} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] max-w-xl flex-col justify-between overflow-hidden bg-[#0b1120] p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="text-[16px] font-semibold tracking-tight text-white">
              Flowforge
            </span>
          </span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h1 className="max-w-md text-[26px] font-semibold leading-tight tracking-tight text-white">
              Automate work with AI, visually.
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              The enterprise platform for building, running, and monitoring
              intelligent workflows.
            </p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
                  <Icon name={h.icon} size={18} />
                </span>
                <div>
                  <p className="text-[13.5px] font-medium text-white">
                    {h.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-slate-400">
                    {h.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-[13px] text-slate-400">
          <div className="flex -space-x-2">
            {["#2563eb", "#7c3aed", "#db2777"].map((c) => (
              <span
                key={c}
                className="h-7 w-7 rounded-full border-2 border-[#0b1120]"
                style={{ background: c }}
              />
            ))}
          </div>
          Trusted by 4,000+ automation teams
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Logo size={26} />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
