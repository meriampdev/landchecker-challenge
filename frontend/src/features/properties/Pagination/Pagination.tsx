import styles from "./Pagination.module.css";

export function pageItems(page: number, pages: number, radius: number) {
  const visible = new Set([1, pages]);
  for (
    let i = Math.max(1, page - radius);
    i <= Math.min(pages, page + radius);
    i++
  )
    visible.add(i);
  const items: (number | string)[] = [];
  [...visible]
    .sort((a, b) => a - b)
    .forEach((value, index, values) => {
      const previous = values[index - 1];
      if (previous && value - previous > 1) items.push(`gap-${previous}`);
      items.push(value);
    });
  return items;
}

export function Pagination({
  page,
  pages,
  total,
  perPage,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}) {
  const start = total ? (page - 1) * perPage + 1 : 0;
  const end = Math.min(page * perPage, total);
  const numbers = (radius: number, className: string) => (
    <div className={className}>
      {pageItems(page, pages, radius).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            aria-label={`Page ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ) : (
          <span key={item} className={styles.ellipsis} aria-label="More pages">
            …
          </span>
        ),
      )}
    </div>
  );
  return (
    <div className={styles.pagination}>
      {pages > 1 && (
        <nav className={styles.controls} aria-label="Search pages">
          <button
            type="button"
            aria-label="Previous"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <span aria-hidden="true">‹</span>
            <span className={styles.direction}>Previous</span>
          </button>
          {numbers(1, styles.desktop)}
          {numbers(0, styles.mobile)}
          <button
            type="button"
            aria-label="Next"
            disabled={page >= pages}
            onClick={() => onChange(page + 1)}
          >
            <span className={styles.direction}>Next</span>
            <span aria-hidden="true">›</span>
          </button>
        </nav>
      )}
      <p className={styles.summary} role="status">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {total.toLocaleString()} results
      </p>
    </div>
  );
}
