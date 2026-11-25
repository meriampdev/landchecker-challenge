import { useState } from "react";
import { Pagination } from "../../properties/Pagination/Pagination";
import { PropertyCard } from "../../properties";
import { useWatchlist } from "../queries";
import { SaveButton } from "../SaveButton/SaveButton";
import styles from "./WatchlistPage.module.css";
export function WatchlistPage() {
  const [page, setPage] = useState(1);
  const query = useWatchlist(page);
  return (
    <section className="watchlist-page">
      <div className="intro">
        <div>
          <p className="eyebrow">YOUR PERSONAL SHORTLIST</p>
          <h1>
            Your <em>watchlist.</em>
          </h1>
        </div>
        <p className="intro-copy">
          The homes that caught your eye, all in one place. Follow their latest
          prices and availability.
        </p>
      </div>
      {query.isPending ? (
        <p role="status">Loading watchlist…</p>
      ) : query.isError ? (
        <div role="alert">
          {query.error.message}
          <button onClick={() => void query.refetch()}>Retry watchlist</button>
        </div>
      ) : query.data.properties.length ? (
        <>
          <div className={styles.grid}>
            {query.data.properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                action={<SaveButton id={p.id} />}
              />
            ))}
          </div>
          {query.data.meta && (
            <Pagination
              page={query.data.meta.page}
              pages={query.data.meta.total_pages}
              total={query.data.meta.total_count}
              perPage={12}
              onChange={setPage}
            />
          )}
        </>
      ) : (
        <p>No saved properties yet. Browse homes to start your watchlist.</p>
      )}
    </section>
  );
}
