import { Button } from "@/app/components/ui/button";
import { Input, Label, Select } from "@/app/components/ui/field";
import type { CategoryWithCount } from "@/app/lib/types";

/*
  Filters — PRD.md 5.2 buyer side: category, price range, sort, availability.

  A plain GET form. Every filter state is a URL, so results are shareable and the
  back button behaves. No client state to drift out of sync with what is shown.
*/

export function ProductFilters({
  categories,
  values,
  action = "/products",
  lockedCategory,
}: {
  categories: CategoryWithCount[];
  values: Record<string, string | undefined>;
  action?: string;
  /** Category pages filter by their own slug, so the selector is hidden there. */
  lockedCategory?: boolean;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-lg border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-1"
    >
      <div>
        <Label htmlFor="filter-q">Search</Label>
        <Input
          id="filter-q"
          name="q"
          type="search"
          defaultValue={values.q ?? ""}
          placeholder="Name or description"
        />
      </div>

      {!lockedCategory && (
        <div>
          <Label htmlFor="filter-category">Category</Label>
          <Select id="filter-category" name="category" defaultValue={values.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name} ({category.product_count})
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="filter-min" hint="MYR">
          Price range
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="filter-min"
            name="min_price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={values.min_price ?? ""}
            placeholder="Min"
          />
          <span className="text-sm text-ink-faint">to</span>
          <Input
            id="filter-max"
            name="max_price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            defaultValue={values.max_price ?? ""}
            placeholder="Max"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="filter-stock">Availability</Label>
        <Select id="filter-stock" name="in_stock" defaultValue={values.in_stock ?? ""}>
          <option value="">Any</option>
          <option value="true">In stock</option>
          <option value="false">Out of stock</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-sort">Sort</Label>
        <Select id="filter-sort" name="sort" defaultValue={values.sort ?? "newest"}>
          <option value="newest">Newest first</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </Select>
      </div>

      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <a
          href={action}
          className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
