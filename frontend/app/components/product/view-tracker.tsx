"use client";

import { useEffect, useRef } from "react";

import { api } from "@/app/lib/api";

/*
  Records one view per product detail page load (Rules.md Section 6 — this
  powers the demand metrics on both dashboards and must not be stubbed).

  Fire-and-forget: the endpoint always answers 204 and nothing on the page
  depends on it, so a failure here is silent by design rather than by accident.
  The ref guard stops React's development double-mount from logging two views
  for one visit.
*/

export function ViewTracker({ productId }: { productId: string }) {
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    if (recorded.current === productId) return;
    recorded.current = productId;

    api
      .post(`/products/${productId}/view`, undefined, { anonymous: true })
      .catch(() => undefined);
  }, [productId]);

  return null;
}
