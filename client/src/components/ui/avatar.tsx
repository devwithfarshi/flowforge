import { cn, initials as toInitials } from "@/lib/utils";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function Avatar({
  name,
  color = "#2563eb",
  size = 32,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
      title={name}
      role="img"
      aria-label={name}
    >
      {toInitials(name)}
    </span>
  );
}
