"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthFormShell } from "@/app/components/site/auth-form-shell";
import { Button } from "@/app/components/ui/button";
import { FieldError, Input, Label } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import { setTokenInBrowser } from "@/app/lib/auth";

/*
  Seller registration. This is the only signup path in v1: buyers browse without
  an account (PRD.md Section 4) and admins are provisioned by script.
*/

type RegisterResponse = { access_token: string; expires_in: number };

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const optional = (key: string) => {
      const value = String(data.get(key) ?? "").trim();
      return value === "" ? null : value;
    };

    try {
      const result = await api.post<RegisterResponse>(
        "/auth/register",
        {
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
          name: String(data.get("name") ?? "").trim(),
          phone: optional("phone"),
          store_name: String(data.get("store_name") ?? "").trim(),
          whatsapp_number: optional("whatsapp_number"),
        },
        { anonymous: true },
      );

      setTokenInBrowser(result.access_token, result.expires_in);
      router.push("/seller/dashboard");
      router.refresh();
    } catch (caught) {
      setPending(false);
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not create the account. Please try again.",
      );
    }
  }

  return (
    <AuthFormShell
      title="Open a shop"
      subtitle="List your products and take questions from buyers directly."
      footer={
        <>
          Already selling here?{" "}
          <Link href="/login" className="font-medium text-accent-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="store_name">Shop name</Label>
          <Input
            id="store_name"
            name="store_name"
            required
            minLength={2}
            maxLength={150}
            placeholder="What buyers will see"
          />
        </div>
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required minLength={2} maxLength={150} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            Buyer inquiries are sent to this address.
          </p>
        </div>
        <div>
          <Label htmlFor="password" hint="at least 8 characters">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
          />
        </div>
        <div>
          <Label htmlFor="whatsapp_number" hint="optional">
            WhatsApp number
          </Label>
          <Input
            id="whatsapp_number"
            name="whatsapp_number"
            maxLength={30}
            placeholder="+60123456789"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            Adds a quick-contact button to your listings.
          </p>
        </div>
        <div>
          <Label htmlFor="phone" hint="optional">
            Phone
          </Label>
          <Input id="phone" name="phone" maxLength={30} />
        </div>

        <FieldError>{error}</FieldError>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating your shop…" : "Create shop"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
