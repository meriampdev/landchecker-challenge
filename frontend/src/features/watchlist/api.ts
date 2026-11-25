import { http } from "../../shared/http";
import type { Property } from "../properties";
export const getWatchlist = (signal?: AbortSignal) =>
  http<{ properties: Property[] }>("/watchlist", { signal });
export const changeWatch = (id: number, saved: boolean, token: string) =>
  http<{ property: Property } | undefined>(`/watchlist/${id}`, {
    method: saved ? "DELETE" : "PUT",
    headers: { "X-CSRF-Token": token },
  });
