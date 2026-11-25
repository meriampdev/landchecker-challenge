import type { QueryClient } from "@tanstack/react-query";
import type { Property, Results } from "./types";
export const propertyKey = ["properties"] as const;
export function patchProperties(
  client: QueryClient,
  change: Pick<Property, "id" | "price_cents" | "status" | "updated_at">,
) {
  client.setQueriesData<Results>(
    { queryKey: propertyKey },
    (old) =>
      old && {
        ...old,
        properties: old.properties.map((p) =>
          p.id === change.id && p.updated_at < change.updated_at
            ? { ...p, ...change }
            : p,
        ),
      },
  );
}
