"use client";

import { PageHeading } from "@/app/components/dashboard/shell";
import { ProductForm } from "@/app/components/product/product-form";

export default function NewProductPage() {
  return (
    <>
      <PageHeading
        title="Add product"
        description="It goes live in the storefront as soon as you save, unless you set it to hidden."
      />
      <ProductForm />
    </>
  );
}
