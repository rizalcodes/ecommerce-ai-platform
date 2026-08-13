"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeading } from "@/app/components/dashboard/shell";
import { LoadingRows, useApi } from "@/app/components/dashboard/use-api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import type { CategoryWithCount } from "@/app/lib/types";

/*
  Taxonomy — PRD.md 5.1: categories are admin-managed only, so this page is the
  single place they are created.

  Every row carries its product count, because the count decides what an admin
  can do with it: the backend refuses to delete a category that still has
  products (the FK is RESTRICT), and the count is what explains why.
*/

export default function AdminCategoriesPage() {
  const { data, error, loading, reload } = useApi<CategoryWithCount[]>("/categories");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    setCreating(true);
    setActionError(null);
    try {
      await api.post("/categories", { name: trimmed });
      setName("");
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Could not create that category.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function rename(category: CategoryWithCount) {
    const trimmed = editingName.trim();
    if (trimmed.length < 2 || trimmed === category.name) {
      setEditingId(null);
      return;
    }

    setBusyId(category.id);
    setActionError(null);
    try {
      // The name only. Renaming does not re-slug: the old slug is already in
      // storefront URLs and in whatever an admin has linked or bookmarked.
      await api.patch(`/categories/${category.id}`, { name: trimmed });
      setEditingId(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Could not rename that category.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: CategoryWithCount) {
    if (!window.confirm(`Delete “${category.name}”? This cannot be undone.`)) return;

    setBusyId(category.id);
    setActionError(null);
    try {
      await api.delete(`/categories/${category.id}`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.message : "Could not delete that category.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeading
        title="Categories"
        description={
          data
            ? `${data.length} categories. Sellers choose from this list; they cannot add to it.`
            : undefined
        }
      />

      <form
        onSubmit={create}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-5"
      >
        <div className="min-w-56 flex-1">
          <label htmlFor="new-category" className="mb-1.5 block text-sm font-medium text-ink">
            Add a category
          </label>
          <Input
            id="new-category"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Home & Living"
            minLength={2}
            maxLength={100}
            required
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            The URL is derived from the name and stays fixed afterwards.
          </p>
        </div>
        <Button type="submit" disabled={creating}>
          {creating ? "Adding…" : "Add category"}
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
        ) : (
          <ul className="divide-y divide-line">
            {data?.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                {editingId === category.id ? (
                  <>
                    <Input
                      autoFocus
                      className="max-w-xs flex-1"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") rename(category);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      minLength={2}
                      maxLength={100}
                    />
                    <span className="flex items-center gap-1">
                      <Button
                        size="sm"
                        onClick={() => rename(category)}
                        disabled={busyId === category.id}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/categories/${category.slug}`}
                        className="block truncate text-sm font-medium text-ink hover:text-accent-ink"
                      >
                        {category.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-faint">/{category.slug}</span>
                    </span>

                    <span
                      className="shrink-0 text-sm tabular-nums text-ink-muted"
                      title="Products a buyer can browse in this category"
                    >
                      {category.product_count} <span className="text-xs">listed</span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                          setActionError(null);
                        }}
                      >
                        Rename
                      </Button>
                      {/* Not disabled on the count above: that count is what a
                          buyer can browse, while a delete is blocked by every
                          product in the category, inactive ones included. The
                          backend's 409 reports the real blocking number. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === category.id}
                        onClick={() => remove(category)}
                      >
                        Delete
                      </Button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
