"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/card";
import { Input, Select } from "@/app/components/ui/field";
import { formatDate, formatPrice } from "@/app/lib/format";
import type {
  AdminUserRow,
  CategoryWithCount,
  Page,
  ProductListItem,
} from "@/app/lib/types";

/*
  Platform-wide catalogue — PRD.md 5.2, admin side: filter by seller, category
  and status.

  Read-only by design. Admins hold no product:* permission (the RBAC seed is
  explicit about it), so there are no edit or delete controls here; the way to
  act on a bad listing is through the seller's account, on /admin/users.
*/

const PAGE_SIZE = 25;

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);

  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (search) query.set("q", search);
  if (sellerId) query.set("seller_id", sellerId);
  if (category) query.set("category", category);
  if (status) query.set("product_status", status);

  const { data, error, loading } = useApi<Page<ProductListItem>>(`/products/admin?${query}`);
  const { data: categories } = useApi<CategoryWithCount[]>("/categories");
  const { data: sellers } = useApi<Page<AdminUserRow>>("/users?role=seller&limit=100");

  /** Any filter change starts the result set again from the first page. */
  function change(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setOffset(0);
    };
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeading
        title="Products"
        description={
          data ? `${data.total} listings match these filters` : "Every listing on the platform"
        }
      />

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(q.trim());
          setOffset(0);
        }}
      >
        <div className="min-w-52 flex-1">
          <Input
            aria-label="Search products"
            placeholder="Search by name or description"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <Select
          aria-label="Seller"
          className="w-48"
          value={sellerId}
          onChange={(event) => change(setSellerId)(event.target.value)}
        >
          <option value="">All sellers</option>
          {sellers?.items.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.store_name ?? seller.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Category"
          className="w-44"
          value={category}
          onChange={(event) => change(setCategory)(event.target.value)}
        >
          <option value="">All categories</option>
          {categories?.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Status"
          className="w-40"
          value={status}
          onChange={(event) => change(setStatus)(event.target.value)}
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {error && (
        <p className="mb-4 rounded-lg border border-line bg-surface px-5 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loading && !data ? (
          <LoadingRows rows={8} />
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.items.map((product) => (
              <li key={product.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-sm border border-line bg-canvas">
                  {product.main_image_url && (
                    <Image
                      src={product.main_image_url}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.id}`}
                    className="block truncate text-sm font-medium text-ink hover:text-accent-ink"
                  >
                    {product.name}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <Link
                      href={`/sellers/${product.seller.id}`}
                      className="hover:text-accent-ink"
                    >
                      {product.seller.store_name ?? product.seller.name}
                    </Link>
                    <span aria-hidden>·</span>
                    <span>{product.category.name}</span>
                    <span aria-hidden>·</span>
                    <span>listed {formatDate(product.created_at)}</span>
                  </span>
                </span>

                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {formatPrice(product.price)}
                </span>

                <span className="w-20 shrink-0 text-right">
                  {product.status === "active" ? (
                    <Badge tone="accent">Active</Badge>
                  ) : (
                    <Badge tone="muted">Inactive</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing matches"
            description="No listing on the platform fits this combination of filters. Try widening one of them."
          />
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <p className="text-sm text-ink-muted">
            Page {page} of {pages}
          </p>
          <Button
            variant="secondary"
            disabled={offset + PAGE_SIZE >= data.total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </nav>
      )}
    </>
  );
}
