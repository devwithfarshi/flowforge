"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { validators } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export default function ProfileSettingsPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    jobTitle: "",
    company: "",
    bio: "",
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user)
      setForm({
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle ?? "",
        company: user.company ?? "",
        bio: user.bio ?? "",
      });
  }, [user]);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const errs = {
      name: validators.required(form.name) ?? undefined,
      email: validators.email(form.email) ?? undefined,
    };
    setErrors(errs);
    if (errs.name || errs.email) return;
    setSaving(true);
    try {
      await api.auth.updateProfile(form);
      await refresh();
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar
            name={form.name || "User"}
            color={user?.avatarColor}
            size={64}
          />
          <div>
            <p className="text-[14px] font-medium text-foreground">
              {form.name || "Your name"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {user?.role} · Member since{" "}
              {user ? new Date(user.createdAt).getFullYear() : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            <Input
              value={form.name}
              onChange={set("name")}
              invalid={!!errors.name}
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              invalid={!!errors.email}
            />
          </Field>
          <Field label="Job title">
            <Input
              value={form.jobTitle}
              onChange={set("jobTitle")}
              placeholder="Automation Lead"
            />
          </Field>
          <Field label="Company">
            <Input
              value={form.company}
              onChange={set("company")}
              placeholder="Acme Inc."
            />
          </Field>
        </div>
        <Field label="Bio" helper="A short description shown on your profile.">
          <Textarea
            value={form.bio}
            onChange={set("bio")}
            placeholder="Tell your team about yourself"
            rows={3}
          />
        </Field>
      </CardContent>
      <CardFooter className="justify-end">
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}
