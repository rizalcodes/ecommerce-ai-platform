"use client";

import { use } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { ProductForm } from "@/app/components/product/product-form";
import type { Product } from "@/app/lib/types";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // /products/{id}/edit rather than the public detail route, so a hidden
  // product can still be opened by the seller who owns it.
  const { data, error, loading } = useApi<Product>(`/products/${id}/edit`);

  return (
    <>
      <PageHeading title="Edit product" description={data?.name} />

      {loading && !data && (
        <div className="rounded-lg border border-line bg-surface">
          <LoadingRows rows={6} />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
          {error}
        </p>
      )}

      {data && <ProductForm product={data} />}
    </>
  );
}
