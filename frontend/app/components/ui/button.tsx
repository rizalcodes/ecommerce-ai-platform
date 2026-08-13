import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
  Buttons — Design.md Sections 2 and 9.

  The primary fill is Sky Blue with a Deep Charcoal label. White-on-Sky-Blue is
  the obvious choice and measures 2.8:1, which fails AA; charcoal on the same
  fill measures 5.3:1. Radius stays small: Design.md rejects pill shapes.
*/

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-soft",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink-faint hover:bg-canvas",
  ghost: "text-ink-muted hover:bg-canvas hover:text-ink",
  // Charcoal rather than a red: the palette is closed, and destructive actions
  // are already guarded by a confirmation step.
  danger: "border border-line-strong bg-surface text-ink hover:border-ink hover:bg-ink hover:text-canvas",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function classes(variant: Variant, size: Size, className?: string) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
