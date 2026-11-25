import { requireLogin } from "../../../shared/navigation";
import { ApiError } from "../../../shared/http";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth";
import type { Watchlist } from "../api";
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
  const saved =
    watch.data?.saved_ids?.includes(id) ??
    !!watch.data?.properties.some((p) => p.id === id);
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
      await auth.mutate((t) => changeWatch(id, saved, t));
      client.setQueriesData<Watchlist>(
        { queryKey: watchKey(userId) },
        (old) => {
          if (!old) return old;
          const remaining = old.properties.filter(
            (property) => property.id !== id,
          );
          const ids =
            old.saved_ids ?? old.properties.map((property) => property.id);
          return {
            ...old,
            saved_ids: saved
              ? ids.filter((value) => value !== id)
              : [...new Set([...ids, id])],
            // The server chooses page membership; don't insert a listing into every cached page.
            properties: saved ? remaining : old.properties,
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
