"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthFormShell } from "@/app/components/site/auth-form-shell";
import { Button } from "@/app/components/ui/button";
import { FieldError, Input, Label } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import { homeForRole, setTokenInBrowser, type Role } from "@/app/lib/auth";

type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: { roles: string[] };
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const result = await api.post<LoginResponse>(
        "/auth/login",
        {
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
        },
        { anonymous: true },
      );

      setTokenInBrowser(result.access_token, result.expires_in);

      // Honour where the visitor was headed before the gate sent them here,
      // but only for in-app paths — an absolute URL would be an open redirect.
      const next = searchParams.get("next");
      const role = (result.user.roles[0] ?? "seller") as Role;
      const destination =
        next && next.startsWith("/") && !next.startsWith("//") ? next : homeForRole(role);

      router.push(destination);
      router.refresh();
    } catch (caught) {
      setPending(false);
      setError(
        caught instanceof ApiError ? caught.message : "Could not sign in. Please try again.",
      );
    }
  }

  return (
    <AuthFormShell
      title="Sign in"
      subtitle="For sellers and platform admins. Buyers do not need an account."
      footer={
        <>
          Want to sell here?{" "}
          <Link href="/register" className="font-medium text-accent-ink hover:underline">
            Open a shop
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <FieldError>{error}</FieldError>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthFormShell>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
