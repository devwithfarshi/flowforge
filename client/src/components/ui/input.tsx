import { forwardRef, useId } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-60";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: IconName;
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftIcon, invalid, inputSize = "md", ...props },
  ref,
) {
  const height = inputSize === "sm" ? "h-8" : "h-9";
  const inner = (
    <input
      ref={ref}
      className={cn(
        fieldBase,
        height,
        "px-3",
        leftIcon && "pl-9",
        invalid && "border-destructive focus-visible:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
  if (!leftIcon) return inner;
  return (
    <div className="relative">
      <Icon
        name={leftIcon}
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      {inner}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        fieldBase,
        "min-h-[80px] resize-y px-3 py-2 leading-relaxed",
        invalid && "border-destructive focus-visible:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
});

export function Label({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-[13px] font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  );
}

interface FieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | null;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  helper,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-[12px] text-destructive">
          <Icon name="alert-circle" size={13} /> {error}
        </p>
      ) : (
        helper && <p className="text-[12px] text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
