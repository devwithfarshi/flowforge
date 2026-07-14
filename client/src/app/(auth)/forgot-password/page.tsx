"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { validators } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validators.email(email);
    if (err) return setError(err);
    setError(undefined);
    setSubmitting(true);
    await api.auth.requestPasswordReset(email);
    setSubmitting(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <Icon name="mail" size={24} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          We sent a password reset link to{" "}
          <span className="font-medium text-foreground">{email}</span>. It may
          take a minute to arrive.
        </p>
        <Link
          href={`/reset-password?email=${encodeURIComponent(email)}`}
          className="mt-5 inline-block"
        >
          <Button variant="outline">Open reset link (demo)</Button>
        </Link>
        <p className="mt-6 text-[13px] text-muted-foreground">
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

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={error}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            leftIcon="mail"
            invalid={!!error}
            autoComplete="email"
          />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Icon name="arrow-left" size={14} /> Back to sign in
        </Link>
      </p>
    </div>
  );
}
