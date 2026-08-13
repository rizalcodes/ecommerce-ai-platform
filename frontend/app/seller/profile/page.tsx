"use client";

import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Button } from "@/app/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import type { CurrentUser } from "@/app/lib/types";

/*
  Shop profile. Everything here is what buyers see on /sellers/[id] and on the
  seller line of a product card, so the copy says so rather than presenting it as
  private account settings.
*/

export default function SellerProfilePage() {
  const { data, error, loading, reload } = useApi<CurrentUser>("/auth/me");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const optional = (key: string) => {
      const value = String(form.get(key) ?? "").trim();
      return value === "" ? null : value;
    };

    try {
      await api.patch("/auth/me", {
        name: String(form.get("name") ?? "").trim(),
        phone: optional("phone"),
        store_name: String(form.get("store_name") ?? "").trim(),
        store_description: optional("store_description"),
        whatsapp_number: optional("whatsapp_number"),
      });
      setSaved(true);
      reload();
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
        {error ?? "Could not load your profile."}
      </p>
    );
  }

  return (
    <>
      <PageHeading
        title="Shop profile"
        description="This is what buyers see on your storefront and next to every listing."
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-5 rounded-lg border border-line bg-surface p-6"
      >
        <div>
          <Label htmlFor="store_name">Shop name</Label>
          <Input
            id="store_name"
            name="store_name"
            required
            minLength={2}
            maxLength={150}
            defaultValue={data.seller_profile?.store_name ?? ""}
          />
        </div>

        <div>
          <Label htmlFor="store_description" hint="optional">
            About the shop
          </Label>
          <Textarea
            id="store_description"
            name="store_description"
            rows={4}
            maxLength={2000}
            defaultValue={data.seller_profile?.store_description ?? ""}
            placeholder="Where you are based, what you stock, how you handle delivery."
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
            defaultValue={data.seller_profile?.whatsapp_number ?? ""}
            placeholder="+60123456789"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            Shown as a quick-contact button on your listings. Leave empty to hide it.
          </p>
        </div>

        <div className="border-t border-line pt-5">
          <h2 className="text-sm font-semibold text-ink">Your details</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Inquiry notifications go to {data.email}.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={150}
                defaultValue={data.name}
              />
            </div>
            <div>
              <Label htmlFor="phone" hint="optional">
                Phone
              </Label>
              <Input id="phone" name="phone" maxLength={30} defaultValue={data.phone ?? ""} />
            </div>
          </div>
        </div>

        <FieldError>{saveError}</FieldError>

        <div className="flex items-center gap-3 border-t border-line pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && <p className="text-sm text-ink-muted">Saved.</p>}
        </div>
      </form>
    </>
  );
}
