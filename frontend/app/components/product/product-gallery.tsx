"use client";

import Image from "next/image";
import { useState } from "react";

import { NoPhoto } from "@/app/components/product/product-card";
import type { ProductImage } from "@/app/lib/types";

/* Main image plus thumbnails. Switching is a state change, not an animation
   (Design.md Section 8). */

export function ProductGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-lg border border-line">
        <NoPhoto />
      </div>
    );
  }

  const active = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface">
        <Image
          src={active.url}
          alt={alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex gap-3">
          {images.map((image, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-current={isActive}
                  className={`relative size-16 overflow-hidden rounded-md border transition-colors ${
                    isActive
                      ? "border-accent-ink"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
