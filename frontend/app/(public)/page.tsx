import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/app/components/product/product-card";
import { StatStrip } from "@/app/components/site/stat-strip";
import { ButtonLink } from "@/app/components/ui/button";
import { api } from "@/app/lib/api";
import { formatCount, formatPrice } from "@/app/lib/format";
import type { CategoryWithCount, Page, PlatformStats, ProductListItem } from "@/app/lib/types";

/*
  Homepage — structure from Design.md Section 5.

  Section 6 of that list (testimonials) is deliberately absent: it may only carry
  real quotes, and this build has no customers to quote. The trust strip carries
  the credibility instead, with counts that come from real rows.
*/

export const dynamic = "force-dynamic";

async function getHomeData() {
  const [stats, categories, newest] = await Promise.all([
    api.get<PlatformStats>("/stats", { anonymous: true, cache: "no-store" }),
    api.get<CategoryWithCount[]>("/categories", { anonymous: true, cache: "no-store" }),
    api.get<Page<ProductListItem>>("/products?limit=8&sort=newest", {
      anonymous: true,
      cache: "no-store",
    }),
  ]);
  return { stats, categories, newest: newest.items };
}

export default async function HomePage() {
  const { stats, categories, newest } = await getHomeData();
  const hero = newest.find((p) => p.main_image_url) ?? newest[0];
  const topCategories = [...categories].sort((a, b) => b.product_count - a.product_count);

  return (
    <>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 lg:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Buy from small Malaysian sellers, and talk to them directly.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {formatCount(stats.total_sellers)} independent shops list what they actually
              have in stock. Ask a question, get an answer from the person who packs the
              order — no cart, no checkout queue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/products" size="lg">
                Browse {formatCount(stats.total_products)} products
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg">
                Sell on PasarKita
              </ButtonLink>
            </div>

            <div className="mt-10">
              <StatStrip stats={stats} />
            </div>
          </div>

          {/* Right column: a real product, the assistant, and a real analytics
              cut — Design.md Section 4. No illustration, no floating shapes. */}
          <div className="grid gap-4">
            {hero && <HeroProduct product={hero} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <AssistantCard />
              <CategoryMixCard categories={topCategories} total={stats.total_products} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Recently listed</h2>
            <p className="mt-1 text-sm text-ink-muted">
              The newest things sellers have put up.
            </p>
          </div>
          <Link
            href="/products?sort=newest"
            className="shrink-0 text-sm font-medium text-accent-ink hover:underline"
          >
            See all
          </Link>
        </div>
        <div className="mt-6">
          <ProductGrid products={newest} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink">How buying works here</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          <ValueProp
            title="Message the seller"
            body="Send a question about any product. It reaches the seller by email and in their dashboard, and they reply to you directly."
          />
          <ValueProp
            title="Ask the product assistant"
            body="Describe what you need and a budget. It only answers from what is actually listed, so it will tell you when nothing fits."
          />
          <ValueProp
            title="Stock you can trust"
            body="Sellers manage their own listings. When something runs out it is marked out of stock rather than quietly sold to you."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pt-20 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-ink">Browse by category</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {topCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group rounded-lg border border-line bg-surface px-4 py-4 transition-colors hover:border-line-strong"
            >
              <p className="text-sm font-medium text-ink group-hover:text-accent-ink">
                {category.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {formatCount(category.product_count)}{" "}
                {category.product_count === 1 ? "product" : "products"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function HeroProduct({ product }: { product: ProductListItem }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block overflow-hidden rounded-lg border border-line bg-surface"
    >
      <div className="relative aspect-[4/3] bg-canvas">
        {product.main_image_url && (
          <Image
            src={product.main_image_url}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
      </div>
      <div className="flex items-end justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-faint">{product.seller.store_name}</p>
          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
        </div>
        <p className="shrink-0 text-base font-semibold text-ink">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

function AssistantCard() {
  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-accent-wash text-sm font-bold text-accent-ink">
        AI
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">Product assistant</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        &ldquo;A gift under RM100 for someone who likes coffee&rdquo; — it searches the
        catalogue and answers with real listings.
      </p>
      <p className="mt-3 text-xs text-ink-faint">Open it from the bottom right corner.</p>
    </div>
  );
}

/*
  The analytics preview from Design.md Section 4. It shows a real cut of real
  data — how the catalogue splits across its biggest categories — rather than a
  decorative chart with invented numbers.
*/
function CategoryMixCard({
  categories,
  total,
}: {
  categories: CategoryWithCount[];
  total: number;
}) {
  const top = categories.slice(0, 3);
  const max = Math.max(1, ...top.map((c) => c.product_count));

  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
      <p className="text-sm font-semibold text-ink">What is listed</p>
      <p className="mt-1 text-xs text-ink-faint">
        Biggest categories of {formatCount(total)}
      </p>
      <ul className="mt-4 space-y-3">
        {top.map((category) => (
          <li key={category.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-ink-muted">{category.name}</span>
              <span className="text-xs font-medium tabular-nums text-ink">
                {category.product_count}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-canvas">
              <div
                className="h-full rounded-sm bg-accent"
                style={{ width: `${(category.product_count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValueProp({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-surface p-6">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
