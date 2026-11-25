import { PropertyCard } from "../../properties";
import { useWatchlist } from "../queries";
import { SaveButton } from "../SaveButton/SaveButton";
import styles from "./WatchlistPage.module.css";
export function WatchlistPage() {
  const query = useWatchlist();
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
        <div className={styles.grid}>
          {query.data.properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              action={<SaveButton id={p.id} />}
            />
          ))}
        </div>
      ) : (
        <p>No saved properties yet. Browse homes to start your watchlist.</p>
      )}
    </section>
  );
}
