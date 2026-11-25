import { useEffect, useState } from "react";

// Only known application destinations are accepted, including from hand-edited URLs.
export function safeReturn(value: string | null): string {
  return value === "/watchlist" ||
    value === "/browse" ||
    /^\/properties\/[1-9][0-9]{0,14}$/.test(value ?? "")
    ? value!
    : "/browse";
}
export function navigate(path: string) {
  window.location.hash = path;
}
export function requireLogin(save?: number) {
  const current = window.location.hash.slice(1).split("?")[0];
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
