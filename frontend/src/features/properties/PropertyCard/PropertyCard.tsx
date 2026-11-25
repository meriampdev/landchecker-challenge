import { useState, type ReactNode } from "react";
import type { Property } from "../types";
import styles from "./PropertyCard.module.css";
export function PropertyCard({
  property: p,
  action,
}: {
  property: Property;
  action?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <article className={styles.card}>
      <div className={styles.media}>
        {p.image_path && !failed ? (
          <img
            className={styles.image}
            src={p.image_path}
            alt={p.title}
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className={styles.placeholder}
            aria-label="Property image unavailable"
          >
            <span>Illustrative home · Photo unavailable</span>
          </div>
        )}
        <span className={styles.tag}>{p.status.replaceAll("_", " ")}</span>
        {action}
      </div>
      <div className={styles.body}>
        <p>{p.property_type}</p>
        <h2>
          <a className={styles.link} href={`#/properties/${p.id}`}>
            {p.title}
          </a>
        </h2>
        <strong>
          {new Intl.NumberFormat("en-AU", {
            style: "currency",
            currency: "AUD",
            maximumFractionDigits: 0,
          }).format(p.price_cents / 100)}
        </strong>
        <p>
          {p.address}
          <br />
          {p.suburb}
        </p>
        <p>
          {p.bedrooms} beds · {p.bathrooms} baths · {p.parking_spaces} parking
        </p>
      </div>
    </article>
  );
}
