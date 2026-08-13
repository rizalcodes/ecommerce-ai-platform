"use client";

import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";

/*
  Contact Seller — PRD.md 5.3. Buyers are unauthenticated in v1, so this posts
  straight to the public /inquiries endpoint.

  The seller is never sent from here: the backend derives it from the product, so
  a buyer cannot address an inquiry to the wrong shop.
*/

type State = "idle" | "sending" | "sent";

export function InquiryForm({ productId }: { productId: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setState("sending");
    setError(null);

    try {
      await api.post(
        "/inquiries",
        {
          product_id: productId,
          buyer_name: String(data.get("buyer_name") ?? "").trim(),
          buyer_contact: String(data.get("buyer_contact") ?? "").trim(),
          message: String(data.get("message") ?? "").trim() || null,
        },
        { anonymous: true },
      );
      form.reset();
      setState("sent");
    } catch (caught) {
      setState("idle");
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not send that just now. Please try again.",
      );
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">Message sent</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          The seller has it in their dashboard and by email. They will reply using the
          contact details you gave.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setState("idle")}
        >
          Ask something else
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Ask the seller</h2>
      <p className="mt-1 text-sm text-ink-muted">
        No account needed. They reply to you directly.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="buyer_name">Your name</Label>
          <Input id="buyer_name" name="buyer_name" required minLength={2} maxLength={150} />
        </div>
        <div>
          <Label htmlFor="buyer_contact" hint="email or phone">
            How to reach you
          </Label>
          <Input
            id="buyer_contact"
            name="buyer_contact"
            required
            minLength={3}
            maxLength={255}
            placeholder="you@example.com or +6012..."
          />
        </div>
        <div>
          <Label htmlFor="message" hint="optional">
            Message
          </Label>
          <Textarea
            id="message"
            name="message"
            rows={4}
            maxLength={2000}
            placeholder="Is this still available? Can you ship to Penang?"
          />
        </div>
      </div>

      <FieldError>{error}</FieldError>

      <Button type="submit" className="mt-4 w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
