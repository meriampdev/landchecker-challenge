import { http } from "../../shared/http";
import type { Filters, Results } from "./types";
export function search(filters: Filters, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    ),
    page: String(page),
  });
  return http<Results>(`/properties?${params}`, { signal });
}
