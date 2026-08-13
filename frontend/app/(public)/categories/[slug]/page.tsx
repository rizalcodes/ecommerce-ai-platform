import Link from "next/link";
import { notFound } from "next/navigation";

import { Pagination } from "@/app/components/product/pagination";
import { ProductFilters } from "@/app/components/product/product-filters";
import { ProductGrid } from "@/app/components/product/product-card";
import { EmptyState } from "@/app/components/ui/card";
import { ApiError, api } from "@/app/lib/api";
import { formatCount } from "@/app/lib/format";
import type { CategoryWithCount, Page, ProductListItem } from "@/app/lib/types";
import { buildProductQuery } from "@/app/(public)/products/page";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const values: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  let category: CategoryWithCount;
  try {
    category = await api.get<CategoryWithCount>(`/categories/${slug}`, {
      anonymous: true,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const [categories, results] = await Promise.all([
    api.get<CategoryWithCount[]>("/categories", { anonymous: true, cache: "no-store" }),
    api.get<Page<ProductListItem>>(
      // The category is fixed by the route, so it is not a filter the visitor
      // can change here.
      `/products?${buildProductQuery({ ...values, category: undefined }, { category: slug })}`,
      { anonymous: true, cache: "no-store" },
    ),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-ink-muted">
        <Link href="/products" className="hover:text-accent-ink">
          Products
        </Link>
      </nav>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{category.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatCount(results.total)} {results.total === 1 ? "product" : "products"} in this
          category
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ProductFilters
            categories={categories}
            values={values}
            action={`/categories/${slug}`}
            lockedCategory
          />
        </aside>

        <div>
          {results.items.length > 0 ? (
            <>
              <ProductGrid products={results.items} />
              <Pagination
                total={results.total}
                limit={results.limit}
                offset={results.offset}
                params={values}
                basePath={`/categories/${slug}`}
              />
            </>
          ) : (
            <EmptyState
              title="Nothing here yet"
              description="No products in this category match those filters. Try resetting them, or browse everything."
            />
          )}
        </div>
      </div>
    </div>
  );
}
