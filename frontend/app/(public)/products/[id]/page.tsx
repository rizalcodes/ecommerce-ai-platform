import Link from "next/link";
import { notFound } from "next/navigation";

import { InquiryForm } from "@/app/components/product/inquiry-form";
import { ProductGallery } from "@/app/components/product/product-gallery";
import { ProductGrid } from "@/app/components/product/product-card";
import { ViewTracker } from "@/app/components/product/view-tracker";
import { Badge } from "@/app/components/ui/badge";
import { ApiError, api } from "@/app/lib/api";
import { formatPrice, stockLabel, whatsappLink } from "@/app/lib/format";
import type { Page, Product, ProductListItem } from "@/app/lib/types";

export const dynamic = "force-dynamic";

async function getProduct(id: string): Promise<Product> {
  try {
    return await api.get<Product>(`/products/${id}`, { anonymous: true, cache: "no-store" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  const alsoFrom = await api
    .get<Page<ProductListItem>>(`/products?seller_id=${product.seller.id}&limit=5`, {
      anonymous: true,
      cache: "no-store",
    })
    .catch(() => null);

  const others = (alsoFrom?.items ?? []).filter((item) => item.id !== product.id).slice(0, 4);
  const stock = stockLabel(product.stock);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <ViewTracker productId={product.id} />

      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/products" className="hover:text-accent-ink">
          Products
        </Link>
        <span aria-hidden className="text-ink-faint">
          /
        </span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-accent-ink">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-sm text-ink-muted hover:text-accent-ink"
            >
              {product.category.name}
            </Link>
            {stock.tone === "out" && <Badge tone="neutral">Out of stock</Badge>}
            {stock.tone === "low" && <Badge tone="highlight">{stock.label}</Badge>}
          </div>

          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ink">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-ink-muted">
              {product.description}
            </p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line text-sm">
            <div className="bg-surface px-4 py-3">
              <dt className="text-xs text-ink-faint">Availability</dt>
              <dd className="mt-0.5 font-medium text-ink">{stock.label}</dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="text-xs text-ink-faint">Sold by</dt>
              <dd className="mt-0.5 font-medium text-ink">
                <Link
                  href={`/sellers/${product.seller.id}`}
                  className="hover:text-accent-ink hover:underline"
                >
                  {product.seller.store_name ?? product.seller.name}
                </Link>
              </dd>
            </div>
          </dl>

          {product.seller.whatsapp_number && (
            <a
              href={whatsappLink(
                product.seller.whatsapp_number,
                `Hi, I saw "${product.name}" on PasarKita and would like to ask about it.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink-faint hover:bg-canvas"
            >
              Message on WhatsApp
            </a>
          )}

          <div className="mt-6">
            <InquiryForm productId={product.id} />
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-20">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            More from {product.seller.store_name ?? product.seller.name}
          </h2>
          <div className="mt-5">
            <ProductGrid products={others} />
          </div>
        </section>
      )}
    </div>
  );
}
