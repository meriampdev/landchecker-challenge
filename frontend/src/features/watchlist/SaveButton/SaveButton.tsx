import { requireLogin } from "../../../shared/navigation";
import { ApiError } from "../../../shared/http";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth";
import type { Property } from "../../properties";
import { changeWatch } from "../api";
import { useWatchlist, watchKey } from "../queries";
import styles from "./SaveButton.module.css";
export function SaveButton({ id }: { id: number }) {
  const auth = useAuth(),
    client = useQueryClient(),
    watch = useWatchlist();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const busy = useRef(false);
  const saved = !!watch.data?.properties.some((p) => p.id === id);
  async function toggle() {
    if (!auth.user) {
      requireLogin(id);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    const userId = auth.user.id;
    setPending(true);
    setError("");
    try {
      const result = await auth.mutate((t) => changeWatch(id, saved, t));
      client.setQueriesData<{ properties: Property[] }>(
        { queryKey: watchKey(userId) },
        (old) => {
          if (!old) return old;
          const remaining = old.properties.filter(
            (property) => property.id !== id,
          );
          return {
            properties:
              saved || !result
                ? remaining
                : [...remaining, result.property].sort((a, b) => a.id - b.id),
          };
        },
      );
      await client.invalidateQueries({ queryKey: watchKey(userId) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401)
        requireLogin(saved ? undefined : id);
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className={styles.control}>
      <button
        disabled={
          auth.ready === false ||
          pending ||
          (!!auth.user && (watch.isPending || watch.isError))
        }
        onClick={() => void toggle()}
        aria-busy={pending}
        title={
          pending
            ? "Updating saved home…"
            : saved
              ? "Remove from watchlist"
              : "Save to watchlist"
        }
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} property ${id}`}
      >
        <span aria-hidden="true" className={styles.heart}>
          {pending ? "…" : saved ? "♥" : "♡"}
        </span>
        <span className={styles.label}>
          {!auth.user
            ? "Log in to save"
            : pending
              ? "Updating…"
              : saved
                ? "Remove from watchlist"
                : "Save property"}
        </span>
      </button>
      {error && <p role="alert">{error}</p>}
      {watch.isError && auth.user && (
        <button onClick={() => void watch.refetch()}>Retry saved status</button>
      )}
    </div>
  );
}
