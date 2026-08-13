/* Display formatting. Prices arrive as decimal strings and stay exact until
   the moment they are rendered. */

const currency = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

export function formatPrice(value: string | number): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(amount) ? currency.format(amount) : "—";
}

const dateFormat = new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", { month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

/** Compact counts for stat tiles: 1200 -> "1,200". */
export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-MY").format(value);
}

/** Strips everything but digits so the number can go into a wa.me link. */
export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function stockLabel(stock: number): { label: string; tone: "ok" | "low" | "out" } {
  if (stock <= 0) return { label: "Out of stock", tone: "out" };
  if (stock <= 5) return { label: `Only ${stock} left`, tone: "low" };
  return { label: "In stock", tone: "ok" };
}
