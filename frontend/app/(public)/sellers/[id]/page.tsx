import { notFound } from "next/navigation";

import { Pagination } from "@/app/components/product/pagination";
import { ProductGrid } from "@/app/components/product/product-card";
import { EmptyState } from "@/app/components/ui/card";
import { ApiError, api } from "@/app/lib/api";
import { formatCount, formatMonthYear, whatsappLink } from "@/app/lib/format";
import type { Page, ProductListItem, SellerPublic } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const offset = typeof raw.offset === "string" ? raw.offset : undefined;

  let seller: SellerPublic;
  try {
    seller = await api.get<SellerPublic>(`/sellers/${id}`, {
      anonymous: true,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const search = new URLSearchParams({ seller_id: id, limit: String(PAGE_SIZE) });
  if (offset) search.set("offset", offset);

  const results = await api.get<Page<ProductListItem>>(`/products?${search}`, {
    anonymous: true,
    cache: "no-store",
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="rounded-lg border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{seller.store_name}</h1>
        {seller.store_description && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">
            {seller.store_description}
          </p>
        )}

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-ink-faint">Listings</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {formatCount(seller.product_count)} active
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Selling since</dt>
            <dd className="mt-0.5 font-medium text-ink">{formatMonthYear(seller.joined_at)}</dd>
          </div>
        </dl>

        {seller.whatsapp_number && (
          <a
            href={whatsappLink(
              seller.whatsapp_number,
              `Hi ${seller.store_name}, I found your shop on PasarKita.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink-faint hover:bg-canvas"
          >
            Message on WhatsApp
          </a>
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight text-ink">Products</h2>
        <div className="mt-5">
          {results.items.length > 0 ? (
            <>
              <ProductGrid products={results.items} />
              <Pagination
                total={results.total}
                limit={results.limit}
                offset={results.offset}
                params={{ offset }}
                basePath={`/sellers/${id}`}
              />
            </>
          ) : (
            <EmptyState
              title="No active listings"
              description="This seller has nothing listed at the moment."
            />
          )}
        </div>
      </section>
    </div>
  );
}
