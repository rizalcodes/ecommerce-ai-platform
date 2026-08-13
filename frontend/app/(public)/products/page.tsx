import { Pagination } from "@/app/components/product/pagination";
import { ProductFilters } from "@/app/components/product/product-filters";
import { ProductGrid } from "@/app/components/product/product-card";
import { EmptyState } from "@/app/components/ui/card";
import { api } from "@/app/lib/api";
import { formatCount } from "@/app/lib/format";
import type { CategoryWithCount, Page, ProductListItem } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

/** Only forwards parameters the API actually accepts. */
export function buildProductQuery(
  params: Record<string, string | undefined>,
  extra: Record<string, string> = {},
): string {
  const search = new URLSearchParams({ limit: String(PAGE_SIZE), ...extra });
  for (const key of ["q", "category", "min_price", "max_price", "in_stock", "sort"]) {
    const value = params[key];
    if (value) search.set(key, value);
  }
  if (params.offset) search.set("offset", params.offset);
  return search.toString();
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  const [categories, results] = await Promise.all([
    api.get<CategoryWithCount[]>("/categories", { anonymous: true, cache: "no-store" }),
    api.get<Page<ProductListItem>>(`/products?${buildProductQuery(params)}`, {
      anonymous: true,
      cache: "no-store",
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink">All products</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatCount(results.total)} {results.total === 1 ? "product" : "products"}
          {params.q ? ` matching “${params.q}”` : ""}
        </p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ProductFilters categories={categories} values={params} />
        </aside>

        <div>
          {results.items.length > 0 ? (
            <>
              <ProductGrid products={results.items} />
              <Pagination
                total={results.total}
                limit={results.limit}
                offset={results.offset}
                params={params}
                basePath="/products"
              />
            </>
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              description="Try widening the price range, clearing the search box, or picking a different category."
            />
          )}
        </div>
      </div>
    </div>
  );
}
