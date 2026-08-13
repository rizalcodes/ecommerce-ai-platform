"use client";

import Link from "next/link";

import {
  BarList,
  Panel,
  ProductMetricList,
  StatCard,
  StatusBar,
} from "@/app/components/dashboard/metrics";
import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { ButtonLink } from "@/app/components/ui/button";
import type { SellerDashboard } from "@/app/lib/types";

/*
  Seller overview — PRD.md 5.5.

  There is no revenue in v1, so the numbers are demand signals: what buyers are
  looking at and what they are asking about. Every figure comes from
  GET /dashboard/seller, scoped to the token's own seller id.
*/

export default function SellerDashboardPage() {
  const { data, error, loading } = useApi<SellerDashboard>("/dashboard/seller");

  if (error) {
    return (
      <>
        <PageHeading title="Overview" />
        <p className="rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
          {error}
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Overview"
        description={
          data ? `Views and inquiries over the last ${data.period_days} days.` : undefined
        }
        action={
          <ButtonLink href="/seller/products/new" size="sm">
            Add product
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active products" value={data?.active_products ?? "—"} />
        <StatCard
          label="Inactive"
          value={data?.inactive_products ?? "—"}
          hint="Not visible to buyers"
        />
        <StatCard label="Inquiries" value={data?.total_inquiries ?? "—"} hint="All time" />
        <StatCard
          label="Unread notifications"
          value={data?.unread_notifications ?? "—"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Inquiries by status"
          action={
            <Link href="/seller/inquiries" className="text-sm text-accent-ink hover:underline">
              Open inbox
            </Link>
          }
        >
          {loading || !data ? (
            <LoadingRows rows={2} />
          ) : (
            <StatusBar
              segments={[
                {
                  key: "new",
                  label: "New",
                  value: data.inquiries_by_status.new,
                  className: "bg-accent",
                },
                {
                  key: "contacted",
                  label: "Contacted",
                  value: data.inquiries_by_status.contacted,
                  className: "bg-highlight",
                },
                {
                  key: "closed",
                  label: "Closed",
                  value: data.inquiries_by_status.closed,
                  className: "bg-ink-faint",
                },
              ]}
            />
          )}
        </Panel>

        <Panel title="Most inquired products">
          {loading || !data ? (
            <LoadingRows />
          ) : (
            <BarList
              items={data.most_inquired_products.map((item) => ({
                key: item.product_id,
                label: item.name,
                value: item.value,
                href: `/products/${item.product_id}`,
                meta: `${item.value} ${item.value === 1 ? "inquiry" : "inquiries"}`,
              }))}
              emptyMessage="No inquiries in this period."
            />
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Most viewed products">
          {loading || !data ? (
            <LoadingRows />
          ) : (
            <ProductMetricList
              items={data.most_viewed_products}
              unit="views"
              emptyMessage="No views recorded in this period."
            />
          )}
        </Panel>
      </div>
    </>
  );
}
