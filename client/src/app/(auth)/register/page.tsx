"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleAuthButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { cn, passwordStrength, validators } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

const STRENGTH_COLOR = [
  "bg-destructive",
  "bg-destructive",
  "bg-warning",
  "bg-warning",
  "bg-success",
  "bg-success",
];

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const strength = passwordStrength(form.password);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string | undefined> = {
      name: validators.required(form.name) ?? undefined,
      email: validators.email(form.email) ?? undefined,
      password: validators.minLength(8)(form.password) ?? undefined,
    };
    setErrors(next);
    if (next.name || next.email || next.password) return;
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success(
        "Account created",
        "Verify your email to unlock everything.",
      );
      router.replace("/verify-email");
    } catch (err) {
      setErrors({
        email: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const u = await loginWithGoogle();
      toast.success(`Welcome, ${u.name.split(" ")[0]}`);
      router.replace("/dashboard");
    } catch {
      toast.error("Google sign-up failed", "Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start building AI workflows in minutes.
        </p>
      </div>

      <GoogleAuthButton
        label="Sign up with Google"
        onClick={handleGoogle}
        loading={googleLoading}
        disabled={submitting}
      />

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[12px] text-muted-foreground">
          or sign up with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}>
          <Input
            value={form.name}
            onChange={set("name")}
            placeholder="Alex Morgan"
            leftIcon="user"
            invalid={!!errors.name}
            autoComplete="name"
          />
        </Field>
        <Field label="Work email" error={errors.email}>
          <Input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@company.com"
            leftIcon="mail"
            invalid={!!errors.email}
            autoComplete="email"
          />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          helper={!errors.password ? "At least 8 characters" : undefined}
        >
          <Input
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="Create a password"
            leftIcon="lock"
            invalid={!!errors.password}
            autoComplete="new-password"
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < strength.score
                        ? STRENGTH_COLOR[strength.score]
                        : "bg-border",
                    )}
                  />
                ))}
              </div>
              <span className="w-20 text-right text-[11px] font-medium text-muted-foreground">
                {strength.label}
              </span>
            </div>
          )}
        </Field>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-muted-foreground">
        By creating an account you agree to our{" "}
        <span className="font-medium text-foreground">Terms</span> and{" "}
        <span className="font-medium text-foreground">Privacy Policy</span>.
      </p>

      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
