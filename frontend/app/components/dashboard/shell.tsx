"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { clearTokenInBrowser } from "@/app/lib/auth";

/*
  Shell for the signed-in areas — Design.md Section 6: a real business tool, not
  a CRUD panel. Fixed sidebar, quiet borders, the current section marked by a
  left rule rather than a filled block.
*/

export type NavItem = { href: string; label: string };

export function DashboardShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function signOut() {
    clearTokenInBrowser();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="flex items-baseline justify-between gap-3">
          <Link href="/" className="text-base font-bold tracking-tight text-ink">
            Pasar<span className="text-accent-ink">Kita</span>
          </Link>
          <span className="text-xs text-ink-faint">{title}</span>
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium lg:border-l-2 lg:rounded-none lg:rounded-r-md ${
                  active
                    ? "bg-accent-wash text-accent-ink lg:border-accent"
                    : "text-ink-muted hover:bg-surface hover:text-ink lg:border-transparent"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 hidden lg:block">
          <button
            type="button"
            onClick={signOut}
            className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
