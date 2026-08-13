"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/app/components/ui/button";
import {
  clearTokenInBrowser,
  getTokenFromBrowser,
  homeForRole,
  readClaims,
  type Role,
} from "@/app/lib/auth";

/*
  Session-aware corner of the header.

  Reads the token cookie on mount rather than during render, so the server and
  the first client paint agree and React does not report a hydration mismatch.
*/

export function AuthNav() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRole(readClaims(getTokenFromBrowser())?.role ?? null);
    setReady(true);
  }, []);

  function signOut() {
    clearTokenInBrowser();
    setRole(null);
    router.push("/");
    router.refresh();
  }

  // Reserve the space until the cookie has been read, so the header does not
  // shift as the page settles.
  if (!ready) return <div className="h-8 w-24" aria-hidden />;

  if (!role) {
    return (
      <ButtonLink href="/login" variant="secondary" size="sm">
        Seller sign in
      </ButtonLink>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={homeForRole(role)}
        className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
      >
        Sign out
      </button>
    </div>
  );
}
