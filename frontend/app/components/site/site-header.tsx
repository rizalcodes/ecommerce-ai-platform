import Link from "next/link";

import { AuthNav } from "@/app/components/site/auth-nav";

/*
  Header — Design.md Section 1: Linear-style restraint. A wordmark, one search,
  the two destinations that matter, and a way in. No mega menu, no announcement
  bar, no gradient.
*/

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-ink">
          Pasar<span className="text-accent-ink">Kita</span>
        </Link>

        <form action="/products" className="hidden min-w-0 flex-1 sm:block">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search products"
            className="h-9 w-full max-w-md rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint hover:border-ink-faint"
          />
        </form>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/products"
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
          >
            Browse
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
