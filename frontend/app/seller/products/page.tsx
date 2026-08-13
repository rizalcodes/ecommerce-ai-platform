"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Badge } from "@/app/components/ui/badge";
import { Button, ButtonLink } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/card";
import { Select } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import { formatPrice } from "@/app/lib/format";
import type { Page, ProductListItem } from "@/app/lib/types";

export default function SellerProductsPage() {
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams({ limit: "100" });
  if (status) query.set("product_status", status);

  const { data, loading, error: loadError, reload } = useApi<Page<ProductListItem>>(
    `/products/mine?${query}`,
  );

  async function remove(product: ProductListItem) {
    const confirmed = window.confirm(
      `Delete “${product.name}”? Its photos, views and inquiry history go with it. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    setError(null);
    try {
      await api.delete(`/products/${product.id}`);
      reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete that product.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Products"
        description={data ? `${data.total} in your shop` : undefined}
        action={
          <ButtonLink href="/seller/products/new" size="sm">
            Add product
          </ButtonLink>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm text-ink-muted">
          Show
        </label>
        <Select
          id="status-filter"
          className="w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All products</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </Select>
      </div>

      {(error || loadError) && (
        <p className="mb-4 rounded-lg border border-line bg-surface px-5 py-3 text-sm text-ink">
          {error ?? loadError}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loading && !data ? (
          <LoadingRows rows={6} />
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
                    href={`/seller/products/${product.id}/edit`}
                    className="block truncate text-sm font-medium text-ink hover:text-accent-ink"
                  >
                    {product.name}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span>{product.category.name}</span>
                    <span aria-hidden>·</span>
                    <span>{formatPrice(product.price)}</span>
                    <span aria-hidden>·</span>
                    <span>{product.stock} in stock</span>
                  </span>
                </span>

                <span className="shrink-0">
                  {product.status === "active" ? (
                    <Badge tone="accent">Active</Badge>
                  ) : (
                    <Badge tone="muted">Inactive</Badge>
                  )}
                </span>

                <span className="flex shrink-0 items-center gap-1">
                  <ButtonLink
                    href={`/seller/products/${product.id}/edit`}
                    variant="ghost"
                    size="sm"
                  >
                    Edit
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(product)}
                    disabled={deletingId === product.id}
                  >
                    {deletingId === product.id ? "Deleting…" : "Delete"}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No products yet"
            description="Add your first listing and it will appear in the storefront straight away."
            action={<ButtonLink href="/seller/products/new">Add product</ButtonLink>}
          />
        )}
      </div>
    </>
  );
}
