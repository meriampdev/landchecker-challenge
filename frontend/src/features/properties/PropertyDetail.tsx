import { useBrowseRoute, useRoute } from "../../shared/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, ApiError } from "../../shared/http";
import { PropertyCard } from "./PropertyCard/PropertyCard";
import type { Property } from "./types";
import styles from "./PropertyDetail.module.css";
export function PropertyDetail({
  id,
  action,
}: {
  id: number;
  action: (property: Property) => ReactNode;
}) {
  const browseRoute = useBrowseRoute(useRoute());
  const query = useQuery({
    queryKey: ["property-detail", id],
    queryFn: ({ signal }) =>
      http<{ property: Property }>(`/properties/${id}`, { signal }),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });
  return (
    <section className={styles.detail}>
      <a href={`#${browseRoute}`}>← Back to explore homes</a>
      {query.isPending ? (
        <p role="status">Loading listing…</p>
      ) : query.isError ? (
        <div role="alert">
          <h1>
            {query.error instanceof ApiError && query.error.status === 404
              ? "Listing not found"
              : "Unable to load listing"}
          </h1>
          <p>{query.error.message}</p>
          <button onClick={() => void query.refetch()}>Retry</button>
        </div>
      ) : (
        <>
          <p className="eyebrow">PROPERTY DETAILS</p>
          <h1>{query.data.property.title}</h1>
          <PropertyCard
            property={query.data.property}
            action={action(query.data.property)}
          />
          <p>
            Prices in AUD · Listing updated{" "}
            {new Date(query.data.property.updated_at).toLocaleDateString(
              "en-AU",
            )}
          </p>
        </>
      )}
    </section>
  );
}
