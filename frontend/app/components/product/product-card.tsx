import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/app/components/ui/badge";
import { formatPrice, stockLabel } from "@/app/lib/format";
import type { ProductListItem } from "@/app/lib/types";

/*
  Product card — the storefront's main unit, so the photograph leads and the
  price is the second thing read (Design.md Section 4: sell the product, not the
  technology).

  Motion is a border and a slight image scale on hover, which is the whole
  allowance from Design.md Section 8.
*/

export function ProductCard({ product }: { product: ProductListItem }) {
  const stock = stockLabel(product.stock);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong"
    >
      <div className="relative aspect-square overflow-hidden bg-canvas">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <NoPhoto />
        )}

        {stock.tone === "out" && (
          <div className="absolute left-3 top-3">
            <Badge tone="neutral">Out of stock</Badge>
          </div>
        )}
        {stock.tone === "low" && (
          <div className="absolute left-3 top-3">
            <Badge tone="highlight">{stock.label}</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs text-ink-faint">{product.category.name}</p>
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-accent-ink">
          {product.name}
        </h3>
        <p className="mt-auto pt-2 text-base font-semibold text-ink">
          {formatPrice(product.price)}
        </p>
        <p className="truncate text-xs text-ink-muted">{product.seller.store_name}</p>
      </div>
    </Link>
  );
}

/** One seeded product has no photo, and real sellers will forget to add one. */
export function NoPhoto() {
  return (
    <div className="flex h-full w-full items-center justify-center border-b border-line bg-canvas">
      <span className="text-xs text-ink-faint">No photo yet</span>
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
