"use client";

import Link from "next/link";
import { use, useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { StatusBadge } from "@/app/components/dashboard/status-badge";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Button } from "@/app/components/ui/button";
import { ApiError, api } from "@/app/lib/api";
import { formatDate, whatsappLink } from "@/app/lib/format";
import type { Inquiry, InquiryStatus } from "@/app/lib/types";

/*
  Status moves forward only: New -> Contacted -> Closed (Rules.md Section 6).
  The backend rejects anything else with a 409, so the UI offers only the moves
  that will actually be accepted rather than letting a seller discover the rule
  through an error.
*/
const NEXT_STATUSES: Record<InquiryStatus, InquiryStatus[]> = {
  new: ["contacted", "closed"],
  contacted: ["closed"],
  closed: [],
};

const ACTION_LABEL: Record<InquiryStatus, string> = {
  new: "Mark as new",
  contacted: "Mark as contacted",
  closed: "Mark as closed",
};

function looksLikeEmail(contact: string) {
  return contact.includes("@");
}

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading, reload } = useApi<Inquiry>(`/inquiries/${id}`);
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function setStatus(status: InquiryStatus) {
    setUpdating(true);
    setActionError(null);
    try {
      await api.patch(`/inquiries/${id}`, { status });
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Could not update the status.",
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="rounded-lg border border-line bg-surface px-5 py-4 text-sm text-ink">
        {error ?? "Inquiry not found."}
      </p>
    );
  }

  const nextStatuses = NEXT_STATUSES[data.status];

  return (
    <>
      <Link
        href="/seller/inquiries"
        className="mb-5 inline-block text-sm text-ink-muted hover:text-accent-ink"
      >
        ← All inquiries
      </Link>

      <PageHeading
        title={data.buyer_name}
        description={`Received ${formatDate(data.created_at)}`}
        action={<StatusBadge status={data.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Message</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
              {data.message || "The buyer did not leave a message."}
            </p>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">About</h2>
            {data.product ? (
              <Link
                href={`/products/${data.product.id}`}
                className="mt-2 block text-sm text-accent-ink hover:underline"
              >
                {data.product.name}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">This product has been removed.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Reply to the buyer</h2>
            <p className="mt-2 break-words text-sm text-ink-muted">{data.buyer_contact}</p>
            <div className="mt-4 flex flex-col gap-2">
              {looksLikeEmail(data.buyer_contact) ? (
                <a
                  href={`mailto:${data.buyer_contact}?subject=${encodeURIComponent(
                    `Re: ${data.product?.name ?? "your inquiry"}`,
                  )}`}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink-faint hover:bg-canvas"
                >
                  Reply by email
                </a>
              ) : (
                <a
                  href={whatsappLink(
                    data.buyer_contact,
                    `Hi ${data.buyer_name}, about your question on ${
                      data.product?.name ?? "our listing"
                    }:`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-ink-faint hover:bg-canvas"
                >
                  Message on WhatsApp
                </a>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Status</h2>
            {nextStatuses.length > 0 ? (
              <>
                <p className="mt-1 text-xs text-ink-faint">
                  Status only moves forward and cannot be reopened.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      variant="secondary"
                      onClick={() => setStatus(status)}
                      disabled={updating}
                    >
                      {ACTION_LABEL[status]}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                This inquiry is closed. Nothing further to do.
              </p>
            )}
            {actionError && <p className="mt-3 text-sm text-ink">{actionError}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
