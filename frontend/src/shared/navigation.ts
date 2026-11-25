import { useEffect, useState } from "react";

// Only known application destinations are accepted, including from hand-edited URLs.
export function safeReturn(value: string | null): string {
  if (
    value === "/watchlist" ||
    /^\/properties\/[1-9][0-9]{0,14}$/.test(value ?? "")
  )
    return value!;
  const [path, query = ""] = (value ?? "").split("?");
  if (path !== "/browse" || value?.includes("#")) return "/browse";
  const params = new URLSearchParams(query);
  const clean = new URLSearchParams();
  for (const [key, raw] of params) {
    if (clean.has(key)) return "/browse";
    const number = Number(raw);
    if (key === "location") {
      if (raw.length > 200) return "/browse";
    } else if (key === "property_type") {
      if (!["house", "apartment", "townhouse"].includes(raw)) return "/browse";
    } else if (
      ["min_price", "max_price", "min_bedrooms", "page"].includes(key)
    ) {
      const limit = key.includes("price") ? 90_071_992_547_409 : 2_147_483_647;
      if (
        !/^\d{1,15}$/.test(raw) ||
        number > limit ||
        (key === "page" && number < 1)
      )
        return "/browse";
    } else return "/browse";
    clean.set(key, raw);
  }
  if (
    clean.has("min_price") &&
    clean.has("max_price") &&
    Number(clean.get("min_price")) > Number(clean.get("max_price"))
  )
    return "/browse";
  return clean.size ? `/browse?${clean}` : "/browse";
}
// Remember the last browse URL for explicit return links, including after a reload.
export function useBrowseRoute(route: string) {
  const browsing = route.split("?")[0] === "/browse";
  const [previous, setPrevious] = useState(() =>
    safeReturn(sessionStorage.getItem("browseRoute")),
  );
  const current = browsing ? safeReturn(route) : previous;
  useEffect(() => {
    if (browsing) {
      setPrevious(current);
      sessionStorage.setItem("browseRoute", current);
    }
  }, [browsing, current]);
  return current;
}

export function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", `#${path}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = path;
}
export function requireLogin(save?: number) {
  const current = window.location.hash.slice(1);
  const params = new URLSearchParams({ returnTo: safeReturn(current) });
  if (save) params.set("save", String(save));
  navigate(`/login?${params}`);
}
export function useRoute() {
  const read = () => window.location.hash.slice(1) || "/browse";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const update = () => setRoute(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
