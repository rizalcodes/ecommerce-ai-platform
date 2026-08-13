"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/card";
import { Input, Select } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import { formatDate } from "@/app/lib/format";
import type { AdminUserRow, Page } from "@/app/lib/types";

/*
  Accounts — PRD.md Section 4 puts users in the admin's remit.

  What an admin can do here is suspend an account and restore it. Not delete:
  removing a seller would take their catalogue and every inquiry attached to it,
  and nothing in v1 asks for that. Not reassign roles either — a role is fixed at
  registration and there is no role-management UI in scope.

  Each row shows the account's footprint, so suspending is a decision made with
  the consequences in view rather than blind.
*/

const PAGE_SIZE = 25;

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (search) query.set("q", search);
  if (role) query.set("role", role);
  if (active) query.set("is_active", active);

  const { data, error, loading, reload } = useApi<Page<AdminUserRow>>(`/users?${query}`);

  async function setStatus(user: AdminUserRow, isActive: boolean) {
    if (!isActive) {
      const confirmed = window.confirm(
        `Suspend ${user.name}? They will be signed out immediately and cannot sign back in. ` +
          `Their ${user.product_count} listing(s) stay in the database and can be restored with the account.`,
      );
      if (!confirmed) return;
    }

    setBusyId(user.id);
    setActionError(null);
    try {
      await api.patch(`/users/${user.id}/status`, { is_active: isActive });
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Could not change that account.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeading
        title="Accounts"
        description={data ? `${data.total} match these filters` : "Sellers and admins"}
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
            aria-label="Search accounts"
            placeholder="Search by name, email or shop"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <Select
          aria-label="Role"
          className="w-40"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">All roles</option>
          <option value="seller">Sellers</option>
          <option value="admin">Admins</option>
        </Select>
        <Select
          aria-label="Account status"
          className="w-40"
          value={active}
          onChange={(event) => {
            setActive(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Suspended</option>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {(actionError || error) && (
        <p className="mb-4 rounded-lg border border-line bg-surface px-5 py-3 text-sm text-ink">
          {actionError ?? error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loading && !data ? (
          <LoadingRows rows={8} />
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.items.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {user.store_name ? (
                      <Link
                        href={`/sellers/${user.id}`}
                        className="truncate text-sm font-medium text-ink hover:text-accent-ink"
                      >
                        {user.store_name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-medium text-ink">{user.name}</span>
                    )}
                    {user.roles.map((name) => (
                      <Badge key={name} tone={name === "admin" ? "highlight" : "neutral"}>
                        {name}
                      </Badge>
                    ))}
                    {!user.is_active && <Badge tone="muted">suspended</Badge>}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="truncate">{user.email}</span>
                    <span aria-hidden>·</span>
                    <span>joined {formatDate(user.created_at)}</span>
                  </span>
                </span>

                <span className="shrink-0 text-right text-xs text-ink-muted">
                  <span className="block tabular-nums">
                    {user.product_count} {user.product_count === 1 ? "product" : "products"}
                  </span>
                  <span className="block tabular-nums">
                    {user.inquiry_count} {user.inquiry_count === 1 ? "inquiry" : "inquiries"}
                  </span>
                </span>

                <span className="shrink-0">
                  <Button
                    size="sm"
                    variant={user.is_active ? "danger" : "secondary"}
                    disabled={busyId === user.id}
                    onClick={() => setStatus(user, !user.is_active)}
                  >
                    {busyId === user.id
                      ? "Saving…"
                      : user.is_active
                        ? "Suspend"
                        : "Restore access"}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No accounts match"
            description="Nothing on the platform fits this combination of filters."
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
