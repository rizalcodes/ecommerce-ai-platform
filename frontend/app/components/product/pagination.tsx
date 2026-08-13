import Link from "next/link";

/* Offset pagination that keeps every active filter in the URL. */

export function Pagination({
  total,
  limit,
  offset,
  params,
  basePath,
}: {
  total: number;
  limit: number;
  offset: number;
  params: Record<string, string | undefined>;
  basePath: string;
}) {
  if (total <= limit) return null;

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);

  const href = (nextOffset: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "offset") search.set(key, value);
    }
    if (nextOffset > 0) search.set("offset", String(nextOffset));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const linkClass =
    "rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-ink-faint";
  const disabledClass =
    "rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-faint";

  return (
    <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
      {offset > 0 ? (
        <Link href={href(Math.max(0, offset - limit))} className={linkClass}>
          Previous
        </Link>
      ) : (
        <span className={disabledClass}>Previous</span>
      )}

      <p className="text-sm text-ink-muted">
        Page {page} of {pages}
      </p>

      {offset + limit < total ? (
        <Link href={href(offset + limit)} className={linkClass}>
          Next
        </Link>
      ) : (
        <span className={disabledClass}>Next</span>
      )}
    </nav>
  );
}
