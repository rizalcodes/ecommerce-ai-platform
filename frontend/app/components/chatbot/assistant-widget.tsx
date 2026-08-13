"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ApiError, api } from "@/app/lib/api";
import { formatPrice } from "@/app/lib/format";
import type { ChatResponse, ProductListItem } from "@/app/lib/types";

/*
  AI Product Assistant — Design.md Section 7.

  Deliberately not a round chat bubble: the launcher is a labelled rectangle that
  says what it does, because a floating circle is the single most generic AI
  affordance there is. Sky Blue is the accent, consistent with the rest of the UI.

  Scope is product discovery only (PRD.md 5.4). The backend refuses analytics
  questions, and the answer is grounded in real listings, so the cards below each
  reply link to products that exist.
*/

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; products: ProductListItem[] };

const SUGGESTIONS = [
  "A gift under RM100 for someone who likes coffee",
  "Something for a home office desk",
  "Skincare under RM100",
];

export function AssistantWidget() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ available: boolean }>("/chatbot/status", { anonymous: true })
      .then((status) => setAvailable(status.available))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, open, pending]);

  // Nothing to offer if the assistant is not configured, so it stays hidden
  // rather than presenting a chat that cannot answer.
  if (!available) return null;

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    setTurns((previous) => [...previous, { role: "user", text }]);
    setPending(true);
    setError(null);

    try {
      const reply = await api.post<ChatResponse>(
        "/chatbot/ask",
        { message: text },
        { anonymous: true },
      );
      setTurns((previous) => [
        ...previous,
        { role: "assistant", text: reply.answer, products: reply.products },
      ]);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The assistant is not responding right now.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex h-11 items-center gap-2 rounded-lg border border-accent-ink/20 bg-accent px-4 text-sm font-semibold text-on-accent shadow-sm hover:bg-accent-soft"
      >
        <span className="inline-flex size-5 items-center justify-center rounded-sm bg-on-accent/10 text-[10px] font-bold">
          AI
        </span>
        Ask about products
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(32rem,calc(100vh-2.5rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border border-line-strong bg-surface shadow-lg">
      <header className="flex items-center justify-between gap-2 border-b border-line bg-canvas px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Product assistant</p>
          <p className="text-xs text-ink-faint">Answers only from what is listed</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-surface hover:text-ink"
        >
          Close
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turns.length === 0 && (
          <div>
            <p className="text-sm leading-relaxed text-ink-muted">
              Describe what you are looking for and a budget. Try one of these:
            </p>
            <ul className="mt-3 space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => send(suggestion)}
                    className="w-full rounded-md border border-line px-3 py-2 text-left text-sm text-ink hover:border-line-strong hover:bg-canvas"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <p
              key={index}
              className="ml-auto max-w-[85%] rounded-md rounded-br-sm bg-accent-wash px-3 py-2 text-sm text-ink"
            >
              {turn.text}
            </p>
          ) : (
            <div key={index} className="max-w-[92%]">
              <p className="whitespace-pre-line rounded-md rounded-bl-sm border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink">
                {turn.text}
              </p>
              {turn.products.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {turn.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md border border-line bg-surface p-2 hover:border-line-strong"
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-canvas">
                          {product.main_image_url && (
                            <Image
                              src={product.main_image_url}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {product.name}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {formatPrice(product.price)} · {product.seller.store_name}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}

        {pending && <p className="text-sm text-ink-faint">Searching the catalogue…</p>}
        {error && <p className="text-sm text-ink">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = inputRef.current?.value ?? "";
          if (inputRef.current) inputRef.current.value = "";
          void send(value);
        }}
        className="border-t border-line p-3"
      >
        <div className="flex items-center gap-2">
          <label htmlFor="assistant-input" className="sr-only">
            Ask about products
          </label>
          <input
            id="assistant-input"
            ref={inputRef}
            maxLength={500}
            placeholder="What are you looking for?"
            className="h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={pending}
            className="h-10 shrink-0 rounded-md bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-soft disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
