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

export function useApi<T>(path: string | null): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (path === null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(path, { cache: "no-store" })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(
          caught instanceof ApiError ? caught.message : "Could not load this right now.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, nonce]);

  return { data, error, loading, reload };
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
