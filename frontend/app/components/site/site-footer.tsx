import Link from "next/link";

import { api } from "@/app/lib/api";
import type { CategoryWithCount } from "@/app/lib/types";

/* Footer — Design.md Section 5, item 7: quick links, categories, contact. */

export async function SiteFooter() {
  let categories: CategoryWithCount[] = [];
  try {
    categories = await api.get<CategoryWithCount[]>("/categories", {
      anonymous: true,
      cache: "no-store",
    });
  } catch {
    // The footer is not worth failing a page over.
  }

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold tracking-tight text-ink">
            Pasar<span className="text-accent-ink">Kita</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            A marketplace for small Malaysian businesses. Browse what independent sellers
            are stocking, and message them directly.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Browse</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/products" className="text-ink-muted hover:text-accent-ink">
                All products
              </Link>
            </li>
            <li>
              <Link
                href="/products?sort=newest"
                className="text-ink-muted hover:text-accent-ink"
              >
                Newest listings
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-ink-muted hover:text-accent-ink">
                Seller sign in
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-ink">Categories</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="text-ink-muted hover:text-accent-ink"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-ink-faint sm:px-6">
          Demo build. Sellers, products and messages shown here are sample data.
        </div>
      </div>
    </footer>
  );
}
