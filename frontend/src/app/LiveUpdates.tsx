import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../features/auth";
import {
  patchProperties,
  propertyKey,
  type Property,
} from "../features/properties";
import {
  patchWatchlist,
  useWatchlist,
  watchKey,
  useWatchlistSubscription,
  type Change,
} from "../features/watchlist";
export function LiveUpdates() {
  const auth = useAuth(),
    client = useQueryClient(),
    watch = useWatchlist();
  const [message, setMessage] = useState("");
  const state = useRef({ auth, watch });
  state.current = { auth, watch };
  const active = useRef(true);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  async function reconcile() {
    try {
      await state.current.auth.refresh();
      if (!active.current) return;
      await Promise.all([
        client.invalidateQueries({
          queryKey: watchKey(state.current.auth.user?.id),
        }),
        client.invalidateQueries({ queryKey: propertyKey }),
        client.invalidateQueries({ queryKey: ["property-detail"] }),
      ]);
    } catch {
      if (active.current)
        setMessage("Could not refresh live values. Please retry.");
    }
  }
  async function changed(change: Change) {
    const user = state.current.auth.user;
    if (
      !user ||
      !state.current.watch.data?.properties.some((p) => p.id === change.id)
    )
      return;
    await Promise.all([
      client.cancelQueries({ queryKey: propertyKey }),
      client.cancelQueries({ queryKey: watchKey(user.id) }),
    ]);
    if (
      !active.current ||
      !state.current.watch.data?.properties.some((p) => p.id === change.id)
    )
      return;
    const confirmed = client.getQueriesData<{ properties: Property[] }>({
      queryKey: watchKey(user.id),
    });
    const old = confirmed
      .flatMap(([, data]) => data?.properties ?? [])
      .find((p) => p.id === change.id);
    if (!old || Date.parse(old.updated_at) >= Date.parse(change.updated_at))
      return;
    void client.invalidateQueries({ queryKey: ["property-detail", change.id] });
    patchProperties(client, change);
    patchWatchlist(client, user.id, change);
    setMessage("A watched property has a new price or status.");
    void client.invalidateQueries({ queryKey: propertyKey });
    void client.invalidateQueries({ queryKey: watchKey(user.id) });
  }
  const live = useWatchlistSubscription(
    `${auth.user?.id}-${auth.generation}`,
    (change) => void changed(change),
    () => void reconcile(),
  );
  return (
    <aside>
      {(!live.connected || message) && (
        <p role="status" aria-live="polite">
          {[!live.connected && "Live updates unavailable", message].filter(Boolean).join(" · ")}
        </p>
      )}
      {!live.connected && (
        <button onClick={live.retry}>Retry live connection</button>
      )}
    </aside>
  );
}
