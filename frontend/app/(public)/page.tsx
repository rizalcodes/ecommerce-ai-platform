"use client";

/*
  M1 setup check — temporary. This route becomes the real homepage in M5
  (Design.md Section 5). It exists now only to prove the Next.js -> FastAPI ->
  Postgres path works end to end, so nothing here is marketing copy or a
  placeholder statistic.
*/

import { useEffect, useState } from "react";

import { api, type HealthResponse } from "@/app/lib/api";

type Probe =
  | { state: "checking" }
  | { state: "reached"; health: HealthResponse }
  | { state: "unreachable"; reason: string };

export default function SetupCheckPage() {
  const [probe, setProbe] = useState<Probe>({ state: "checking" });

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<HealthResponse>("/health", { anonymous: true, cache: "no-store", signal: controller.signal })
      .then((health) => setProbe({ state: "reached", health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProbe({
          state: "unreachable",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
        Milestone 1 — setup
      </p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Project scaffold is running</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Frontend and backend are wired together. This page is replaced by the storefront
        homepage in milestone 5.
      </p>

      <dl className="mt-10 divide-y divide-line rounded-lg border border-line bg-surface">
        <Row label="Next.js frontend" value="running" tone="ok" />
        <Row
          label="FastAPI backend"
          value={
            probe.state === "checking"
              ? "checking…"
              : probe.state === "reached"
                ? "reachable"
                : "unreachable"
          }
          tone={probe.state === "reached" ? "ok" : probe.state === "checking" ? "idle" : "warn"}
        />
        <Row
          label="Supabase Postgres"
          value={
            probe.state === "checking"
              ? "checking…"
              : probe.state === "reached"
                ? probe.health.database === "ok"
                  ? "connected"
                  : `not connected (${probe.health.detail ?? "unknown"})`
                : "not checked"
          }
          tone={
            probe.state === "reached"
              ? probe.health.database === "ok"
                ? "ok"
                : "warn"
              : "idle"
          }
        />
      </dl>

      {probe.state === "unreachable" && (
        <p className="mt-4 text-sm text-ink-muted">
          Backend did not respond ({probe.reason}). Start it with{" "}
          <code className="rounded-sm bg-accent-wash px-1.5 py-0.5 text-accent-ink">
            uvicorn app.main:app --reload
          </code>{" "}
          from <code className="text-ink">backend/</code>.
        </p>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "idle";
}) {
  const dot =
    tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-highlight" : "bg-line-strong";

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <dt className="text-sm font-medium text-ink">{label}</dt>
      <dd className="flex items-center gap-2 text-sm text-ink-muted">
        <span className={`size-1.5 rounded-full ${dot}`} aria-hidden />
        {value}
      </dd>
    </div>
  );
}
