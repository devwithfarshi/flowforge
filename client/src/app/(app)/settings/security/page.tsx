"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ApiError, api } from "@/lib/api";
import { validators } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export default function SecuritySettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    api.settings.getSettings().then((s) => setTwoFactor(s.twoFactorEnabled));
  }, []);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const changePassword = async () => {
    const errs = {
      current: validators.required(form.current) ?? undefined,
      next: validators.minLength(8)(form.next) ?? undefined,
      confirm:
        validators.match(form.next, "Passwords")(form.confirm) ?? undefined,
    };
    setErrors(errs);
    if (errs.current || errs.next || errs.confirm) return;
    setSaving(true);
    try {
      await api.auth.changePassword(form.current, form.next);
      toast.success("Password changed");
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setErrors({
        current:
          err instanceof ApiError ? err.message : "Failed to change password",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle2fa = async (v: boolean) => {
    setTwoFactor(v);
    await api.settings.updateSettings({ twoFactorEnabled: v });
    toast.success(
      v
        ? "Two-factor authentication enabled"
        : "Two-factor authentication disabled",
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Current password" required error={errors.current}>
            <Input
              type="password"
              value={form.current}
              onChange={set("current")}
              leftIcon="lock"
              invalid={!!errors.current}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" required error={errors.next}>
              <Input
                type="password"
                value={form.next}
                onChange={set("next")}
                leftIcon="lock"
                invalid={!!errors.next}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required error={errors.confirm}>
              <Input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                leftIcon="lock"
                invalid={!!errors.confirm}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Demo account password is{" "}
            <span className="font-mono font-medium text-foreground">
              demo1234
            </span>
            .
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button loading={saving} onClick={changePassword}>
            Update password
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${twoFactor ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
              >
                <Icon name="shield-check" size={20} />
              </span>
              <div>
                <p className="text-[14px] font-medium text-foreground">
                  Authenticator app
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {twoFactor
                    ? "Enabled — an extra layer of security."
                    : "Add an extra layer of security to your account."}
                </p>
              </div>
            </div>
            <Switch checked={twoFactor} onChange={toggle2fa} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
