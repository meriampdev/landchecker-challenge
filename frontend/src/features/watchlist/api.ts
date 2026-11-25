import { http } from "../../shared/http";
import type { Property } from "../properties";
export type Watchlist = {
  properties: Property[];
  saved_ids?: number[];
  meta?: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};
export const getWatchlist = (signal?: AbortSignal, page = 1) =>
  http<Watchlist>(`/watchlist?page=${page}`, { signal });
export const changeWatch = (id: number, saved: boolean, token: string) =>
  http<{ property: Property } | undefined>(`/watchlist/${id}`, {
    method: saved ? "DELETE" : "PUT",
    headers: { "X-CSRF-Token": token },
  });
