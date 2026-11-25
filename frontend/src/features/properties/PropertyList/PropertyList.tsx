import { useEffect, useRef, type ReactNode } from "react";
import { navigate, useRoute } from "../../../shared/navigation";
import { useQuery } from "@tanstack/react-query";
import { search } from "../api";
import type { Filters, Property } from "../types";
import { PropertyCard } from "../PropertyCard/PropertyCard";
import { PropertyFilters } from "../PropertyFilters/PropertyFilters";
import { Pagination } from "../Pagination/Pagination";
import styles from "./PropertyList.module.css";
export function PropertyList({
  action,
}: {
  action: (p: Property) => ReactNode;
}) {
  const route = useRoute();
  const [path, searchParams = ""] = route.split("?");
  const params = new URLSearchParams(path === "/browse" ? searchParams : "");
  const filters: Filters = {};
  for (const key of [
    "location",
    "min_price",
    "max_price",
    "min_bedrooms",
    "property_type",
  ] as const) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  const rawPage = params.get("page");
  const parsedPage = Number(rawPage);
  const page =
    rawPage && /^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(parsedPage)
      ? parsedPage
      : 1;
  const results = useRef<HTMLDivElement>(null);
  const previousPage = useRef(page);
  function changePage(next: number, replace = false) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("page", String(next));
    const nextRoute = `/browse?${nextParams}`;
    if (replace) {
      window.history.replaceState(null, "", `#${nextRoute}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else navigate(nextRoute);
  }
  useEffect(() => {
    if (path === "/browse" && rawPage !== null && String(page) !== rawPage)
      changePage(page, true);
  }, [route]);
  useEffect(() => {
    if (previousPage.current !== page)
      results.current?.scrollIntoView?.({ block: "start" });
    previousPage.current = page;
  }, [page]);
  const query = useQuery({
    queryKey: ["properties", filters, page],
    queryFn: ({ signal }) => search(filters, page, signal),
    retry: false,
  });
  useEffect(() => {
    if (
      query.data &&
      page > Math.max(1, query.data.meta.total_pages) &&
      path === "/browse"
    ) {
      changePage(Math.max(1, query.data.meta.total_pages), true);
    }
  }, [query.data, page, path]);
  return (
    <section>
      <div className="intro">
        <div>
          <p className="eyebrow">HOMES WITH CHARACTER</p>
          <h1>
            Find somewhere
            <br />
            <em>remarkable.</em>
          </h1>
        </div>
        <p className="intro-copy">
          A considered collection of distinctive homes, selected for the way you
          want to live.
        </p>
      </div>
      <form
        className="home-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextParams = new URLSearchParams(params);
          const location = String(
            new FormData(event.currentTarget).get("location") ?? "",
          ).trim();
          if (location) nextParams.set("location", location);
          else nextParams.delete("location");
          nextParams.set("page", "1");
          navigate(`/browse?${nextParams}`);
          results.current?.scrollIntoView?.({
            block: "start",
            behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          });
        }}
      >
        <svg className="search-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="10" />
          <path d="m21.5 21.5 7 7" />
        </svg>
        <label className="search-location">
          <span>Where would you like to live?</span>
          <input
            key={filters.location ?? ""}
            name="location"
            type="search"
            placeholder="Area, postcode or street"
            maxLength={200}
            defaultValue={filters.location ?? ""}
          />
        </label>
        <button type="submit">
          Search homes
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12h16m-7-7 7 7-7 7" />
          </svg>
        </button>
      </form>
      <div className="content-grid">
        <aside aria-label="Property filters">
          <h2 className="filter-title">Refine your search</h2>
          <PropertyFilters
            key={JSON.stringify(filters)}
            initialFilters={filters}
            onApply={(next) => {
              const nextParams = new URLSearchParams(params);
              for (const key of Object.keys(filters)) nextParams.delete(key);
              for (const [key, value] of Object.entries(next)) {
                if (value) nextParams.set(key, value);
              }
              nextParams.set("page", "1");
              navigate(`/browse?${nextParams}`);
            }}
          />
        </aside>
        <div className="results" ref={results} aria-busy={query.isFetching}>
          {query.isPending ||
          (query.data && page > Math.max(1, query.data.meta.total_pages)) ? (
            <p role="status">Loading properties…</p>
          ) : query.isError ? (
            <div role="alert">
              {query.error.message}{" "}
              <button onClick={() => void query.refetch()}>Retry search</button>
            </div>
          ) : (
            <>
              <p aria-live="polite">
                {query.data.meta.total_count} properties found
              </p>
              {!query.data.properties.length && (
                <p>No properties match these filters.</p>
              )}
              <div className={styles.grid}>
                {query.data.properties.map((p) => (
                  <PropertyCard key={p.id} property={p} action={action(p)} />
                ))}
              </div>
              <Pagination
                page={page}
                pages={query.data.meta.total_pages}
                total={query.data.meta.total_count}
                perPage={query.data.meta.per_page}
                onChange={changePage}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
