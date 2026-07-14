import { cn } from "@/lib/utils";

export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <circle cx="10" cy="11" r="2.4" fill="white" />
      <circle cx="22" cy="11" r="2.4" fill="white" fillOpacity="0.65" />
      <circle cx="16" cy="21.5" r="2.4" fill="white" />
      <path
        d="M10 11h12M10.5 12.6 15 20M21.5 12.6 17 20"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}

export function Logo({
  size = 28,
  className,
  hideWordmark,
}: {
  size?: number;
  className?: string;
  hideWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {!hideWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Flowforge
        </span>
      )}
    </span>
  );
}
