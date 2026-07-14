"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export default function VerifyEmailPage() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = async () => {
    setVerifying(true);
    try {
      const u = await api.auth.verifyEmail();
      setUser(u);
      toast.success("Email verified", "Your account is fully active.");
      router.replace("/dashboard");
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="mail" size={24} />
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
        Verify your email
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We sent a verification link to{" "}
        <span className="font-medium text-foreground">{user?.email}</span>.
        Click the button below to simulate confirming it.
      </p>

      <div className="mt-6 space-y-2.5">
        <Button
          className="w-full"
          size="lg"
          loading={verifying}
          onClick={verify}
          leftIcon="check-circle"
        >
          I&apos;ve verified my email
        </Button>
        <Button
          variant="outline"
          className="w-full"
          disabled={resent}
          onClick={() => {
            setResent(true);
            toast.info("Verification email resent");
          }}
        >
          {resent ? "Email sent" : "Resend email"}
        </Button>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-6 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
