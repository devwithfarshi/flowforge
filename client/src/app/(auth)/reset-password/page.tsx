"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { validators } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      password: validators.minLength(8)(password) ?? undefined,
      confirm: validators.match(password, "Passwords")(confirm) ?? undefined,
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setSubmitting(true);
    await api.auth.resetPassword(email, password);
    setSubmitting(false);
    toast.success("Password updated", "Sign in with your new password.");
    router.replace("/login");
  };

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {email
            ? `For ${email}`
            : "Choose a strong password you don't use elsewhere."}
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label="New password"
          error={errors.password}
          helper={!errors.password ? "At least 8 characters" : undefined}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            leftIcon="lock"
            invalid={!!errors.password}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            leftIcon="lock"
            invalid={!!errors.confirm}
            autoComplete="new-password"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Reset password
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <ResetForm />
    </Suspense>
  );
}
