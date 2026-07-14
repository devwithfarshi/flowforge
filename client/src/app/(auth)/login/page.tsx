"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { validators } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("demo@flowforge.app");
  const [password, setPassword] = useState("demo1234");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      email: validators.email(email) ?? undefined,
      password: validators.required(password) ?? undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;
    setSubmitting(true);
    try {
      const u = await login(email, password, remember);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      router.replace("/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Something went wrong";
      setErrors({ password: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Sign in to Flowforge
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Welcome back. Enter your details to continue.
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-[13px] text-foreground">
        <span className="font-medium">Demo account</span> — pre-filled below.
        Just click Sign in.
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            leftIcon="mail"
            invalid={!!errors.email}
            autoComplete="email"
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon="lock"
              invalid={!!errors.password}
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <span className="text-[11px] font-medium">
                {showPw ? "Hide" : "Show"}
              </span>
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
            <Checkbox
              checked={remember}
              onChange={setRemember}
              aria-label="Remember me"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
