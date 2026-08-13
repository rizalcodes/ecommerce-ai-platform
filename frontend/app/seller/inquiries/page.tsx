"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { StatusBadge } from "@/app/components/dashboard/status-badge";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { EmptyState } from "@/app/components/ui/card";
import { Select } from "@/app/components/ui/field";
import { formatDate } from "@/app/lib/format";
import type { Inquiry, Page } from "@/app/lib/types";

export default function SellerInquiriesPage() {
  const [status, setStatus] = useState("");

  const query = new URLSearchParams({ limit: "100" });
  if (status) query.set("inquiry_status", status);

  const { data, error, loading } = useApi<Page<Inquiry>>(`/inquiries/mine?${query}`);

  return (
    <>
      <PageHeading
        title="Inquiries"
        description={data ? `${data.total} from buyers` : undefined}
      />

      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="inquiry-status" className="text-sm text-ink-muted">
          Show
        </label>
        <Select
          id="inquiry-status"
          className="w-44"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-line bg-surface px-5 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loading && !data ? (
          <LoadingRows rows={6} />
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.items.map((inquiry) => (
              <li key={inquiry.id}>
                <Link
                  href={`/seller/inquiries/${inquiry.id}`}
                  className="block px-5 py-4 hover:bg-canvas"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{inquiry.buyer_name}</span>
                      <StatusBadge status={inquiry.status} />
                    </span>
                    <span className="text-xs text-ink-faint">
                      {formatDate(inquiry.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {inquiry.product?.name ?? "Product removed"}
                  </p>
                  {inquiry.message && (
                    <p className="mt-1 line-clamp-1 text-sm text-ink-faint">
                      {inquiry.message}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No inquiries yet"
            description="When a buyer messages you about a product, it lands here and in your email."
          />
        )}
      </div>
    </>
  );
}
