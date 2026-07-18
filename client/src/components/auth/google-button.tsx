"use client";

import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Real Google OAuth Web client id, inlined at build time (must be referenced
// literally so Next.js inlines it — see the env-variables guide).
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GIS_SRC = "https://accounts.google.com/gsi/client";

type GoogleId = {
  accounts: {
    id: {
      initialize: (c: {
        client_id: string;
        callback: (r: { credential?: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

const getGoogle = (): GoogleId | undefined =>
  (window as unknown as { google?: GoogleId }).google;

// Load the Google Identity Services script once, shared across button instances.
let gisPromise: Promise<GoogleId | null> | null = null;
function loadGis(): Promise<GoogleId | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const existing = getGoogle();
  if (existing?.accounts?.id) return Promise.resolve(existing);
  if (!gisPromise) {
    gisPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(getGoogle() ?? null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

function GoogleGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

interface GoogleAuthButtonProps {
  label?: string;
  /** Called with the Google ID token (JWT) once the user completes sign-in. */
  onCredential: (idToken: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Google sign-in button (blueprint §4.5). Renders the app's styled button and
 * overlays a real, transparent Google Identity Services button on top so clicks
 * trigger Google's flow (which yields an ID token) while the custom look is kept.
 * The ID token is handed to `onCredential`, which posts it to `/auth/google`.
 */
export function GoogleAuthButton({
  label = "Continue with Google",
  onCredential,
  loading,
  disabled,
  className,
}: GoogleAuthButtonProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    loadGis().then((google) => {
      if (cancelled) return;
      const el = overlayRef.current;
      if (!google || !el) {
        setFailed(true);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => {
          if (res.credential) onCredentialRef.current(res.credential);
        },
      });
      const width = Math.min(
        400,
        Math.max(200, Math.floor(el.getBoundingClientRect().width) || 320),
      );
      el.replaceChildren();
      google.accounts.id.renderButton(el, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const inert = loading || disabled || failed || !GOOGLE_CLIENT_ID;

  return (
    <div className={cn("group relative", className)}>
      {/* Visual only — the styled button the app design calls for. */}
      <div
        className={cn(
          "flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground transition-colors",
          !inert && "group-hover:bg-accent",
          disabled && "opacity-60",
        )}
      >
        {loading ? (
          <Spinner size={18} className="text-muted-foreground" />
        ) : (
          <GoogleGlyph />
        )}
        {label}
      </div>
      {/* Real Google button, transparent + overlaid so it receives the clicks.
          opacity-0 elements stay interactive; disabled while a request is in flight. */}
      <div
        ref={overlayRef}
        className={cn(
          "absolute inset-0 overflow-hidden opacity-0",
          inert && "pointer-events-none",
        )}
      />
    </div>
  );
}
