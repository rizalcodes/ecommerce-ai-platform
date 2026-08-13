import type { ReactNode } from "react";

/*
  Badges — Design.md Section 2 keeps Warm Yellow as a micro-accent, and this is
  one of the few places it appears. Radius is small on purpose: Section 9 rejects
  pill-shaped components, so these are rounded rectangles.
*/

type Tone = "neutral" | "accent" | "highlight" | "muted";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong bg-canvas text-ink",
  accent: "border-transparent bg-accent-wash text-accent-ink",
  highlight: "border-transparent bg-highlight-wash text-on-highlight",
  muted: "border-line bg-surface text-ink-faint",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
