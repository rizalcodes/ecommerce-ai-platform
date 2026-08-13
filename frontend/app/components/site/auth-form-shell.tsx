import type { ReactNode } from "react";

/* Shared frame for /login and /register. Centred card on the Broken White
   canvas — no split-screen hero image, no marketing panel.

   These routes sit inside the public layout (Architecture.md Section 2), which
   already renders the wordmark, so this frame does not repeat it. */

export function AuthFormShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>

      <div className="mt-7 rounded-lg border border-line bg-surface p-6">{children}</div>

      <p className="mt-5 text-center text-sm text-ink-muted">{footer}</p>
    </div>
  );
}
