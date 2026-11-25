import { useState, type FormEvent } from "react";
import type { Filters } from "../types";
import styles from "./PropertyFilters.module.css";
export function PropertyFilters({
  onApply,
  initialFilters = {},
}: {
  onApply: (filters: Filters) => void;
  initialFilters?: Filters;
}) {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  function submit(e: FormEvent) {
    e.preventDefault();
    onApply(draft);
  }
  return (
    <form className={styles.filters} onSubmit={submit}>
      <label>
        Location
        <input
          type="text"
          placeholder="Suburb, postcode or address"
          maxLength={200}
          value={draft.location ?? ""}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
        />
      </label>
      {(["min_price", "max_price", "min_bedrooms"] as const).map((key) => (
        <label key={key}>
          {
            {
              min_price: "Minimum price (AUD)",
              max_price: "Maximum price (AUD)",
              min_bedrooms: "Minimum bedrooms",
            }[key]
          }
          <input
            type="number"
            min="0"
            step="1"
            value={draft[key] ?? ""}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        </label>
      ))}
      <label>
        Property type
        <select
          value={draft.property_type ?? ""}
          onChange={(e) =>
            setDraft({ ...draft, property_type: e.target.value })
          }
        >
          <option value="">All types</option>
          {["house", "apartment", "townhouse"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <button type="submit">Apply filters</button>
      <button
        type="button"
        onClick={() => {
          setDraft({});
          onApply({});
        }}
      >
        Clear
      </button>
    </form>
  );
}
