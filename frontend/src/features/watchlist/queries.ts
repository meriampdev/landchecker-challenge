import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import type { Property } from "../properties";
import { getWatchlist } from "./api";
export const watchKey = (id: number | undefined) => ["watchlist", id] as const;
export function useWatchlist() {
  const auth = useAuth();
  return useQuery({
    queryKey: [...watchKey(auth.user?.id), auth.generation],
    enabled: !!auth.user,
    queryFn: ({ signal }) => auth.mutate(() => getWatchlist(signal)),
    retry: false,
  });
}
export function patchWatchlist(
  client: QueryClient,
  id: number,
  change: Pick<Property, "id" | "price_cents" | "status" | "updated_at">,
) {
  client.setQueriesData<{ properties: Property[] }>(
    { queryKey: watchKey(id) },
    (old) =>
      old && {
        properties: old.properties.map((p) =>
          p.id === change.id && p.updated_at < change.updated_at
            ? { ...p, ...change }
            : p,
        ),
      },
  );
}
