"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useApi } from "@/app/components/dashboard/use-api";
import { Button } from "@/app/components/ui/button";
import { FieldError, Input, Label, Select, Textarea } from "@/app/components/ui/field";
import { ApiError, api } from "@/app/lib/api";
import type { CategoryWithCount, Product } from "@/app/lib/types";

/*
  Shared by /seller/products/new and /seller/products/[id]/edit.

  Images upload one at a time to /uploads, which returns a public Supabase URL;
  the product payload then carries those URLs (Architecture.md 4.1). The first
  image in the list is the main one, and reordering is done by promoting an
  image rather than by drag and drop, which would be fussy for the payoff.

  The seller is never part of the payload — the backend takes it from the token.
*/

type ImageDraft = { url: string };

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const { data: categories } = useApi<CategoryWithCount[]>("/categories");

  const [images, setImages] = useState<ImageDraft[]>(
    product?.images.map((image) => ({ url: image.url })) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const { url } = await api.upload<{ url: string }>("/uploads", file);
        setImages((current) => [...current, { url }]);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      category_id: String(data.get("category_id") ?? ""),
      description: String(data.get("description") ?? "").trim() || null,
      price: String(data.get("price") ?? "0"),
      stock: Number(data.get("stock") ?? 0),
      status: String(data.get("status") ?? "active"),
      images: images.map((image, index) => ({
        url: image.url,
        is_main: index === 0,
        sort_order: index,
      })),
    };

    try {
      if (product) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      router.push("/seller/products");
      router.refresh();
    } catch (caught) {
      setSaving(false);
      setError(caught instanceof ApiError ? caught.message : "Could not save this product.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <div>
          <Label htmlFor="name">Product name</Label>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={200}
            defaultValue={product?.name}
          />
        </div>

        <div>
          <Label htmlFor="category_id">Category</Label>
          <Select
            id="category_id"
            name="category_id"
            required
            defaultValue={product?.category.id ?? ""}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-ink-faint">
            Categories are managed by the platform. Ask an admin if yours is missing.
          </p>
        </div>

        <div>
          <Label htmlFor="description" hint="optional">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={6}
            maxLength={5000}
            defaultValue={product?.description ?? ""}
            placeholder="What it is, the details a buyer would ask about, and anything they should know before ordering."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label htmlFor="price" hint="MYR">
              Price
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={product?.price}
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={product?.stock ?? 0}
            />
          </div>
          <div>
            <Label htmlFor="status">Visibility</Label>
            <Select id="status" name="status" defaultValue={product?.status ?? "active"}>
              <option value="active">Listed</option>
              <option value="inactive">Hidden</option>
            </Select>
          </div>
        </div>

        <FieldError>{error}</FieldError>

        <div className="flex items-center gap-3 border-t border-line pt-5">
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "Saving…" : product ? "Save changes" : "Add product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-line bg-surface p-6">
        <div>
          <h2 className="text-sm font-semibold text-ink">Photos</h2>
          <p className="mt-1 text-xs text-ink-faint">
            The first photo is the one buyers see in the grid. JPEG, PNG, WebP or AVIF, up
            to 5MB each.
          </p>
        </div>

        {images.length > 0 && (
          <ul className="space-y-2">
            {images.map((image, index) => (
              <li
                key={image.url}
                className="flex items-center gap-3 rounded-md border border-line p-2"
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-canvas">
                  <Image src={image.url} alt="" fill sizes="48px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1 text-xs text-ink-muted">
                  {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                </span>
                <span className="flex shrink-0 gap-1">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setImages((current) => [
                          current[index],
                          ...current.filter((_, i) => i !== index),
                        ])
                      }
                    >
                      Make main
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setImages((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Label htmlFor="photos">Add photos</Label>
          <input
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-line-strong file:bg-canvas file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:border-ink-faint"
          />
          {uploading && <p className="mt-2 text-xs text-ink-muted">Uploading…</p>}
        </div>
      </div>
    </form>
  );
}
