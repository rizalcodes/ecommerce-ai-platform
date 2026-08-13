"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/app/lib/api";

/*
  Signed-in pages read their data in the browser, because the bearer token lives
  in a cookie this client reads directly (see lib/auth.ts). One hook so every
  dashboard page has the same loading, error and refresh behaviour.
*/

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/** What one settled request produced, tagged with the request it answered. */
type Settled<T> = { key: string; data: T | null; error: string | null };

export function useApi<T>(path: string | null): State<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // Changing the path or asking for a reload makes a new key, and "loading" is
  // simply the key not having settled yet. Deriving it rather than storing it
  // keeps every setState inside the async callbacks, where it belongs.
  const key = `${nonce}:${path}`;

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (path === null) return;

    let cancelled = false;

    api
      .get<T>(path, { cache: "no-store" })
      .then((result) => {
        if (!cancelled) setSettled({ key, data: result, error: null });
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setSettled({
          key,
          data: null,
          error:
            caught instanceof ApiError ? caught.message : "Could not load this right now.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const current = settled?.key === key ? settled : null;

  return {
    // While a new request is in flight the previous result stays on screen, so
    // changing a filter does not blank the page it is filtering.
    data: current ? current.data : (settled?.data ?? null),
    error: current?.error ?? null,
    loading: current === null,
    reload,
  };
}

export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 px-5 py-4" aria-busy>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-4 animate-pulse rounded-sm bg-canvas" />
      ))}
    </div>
  );
}
