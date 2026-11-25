import { requireLogin, safeReturn } from "./navigation";
it.each([
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/login",
  "javascript:alert(1)",
  null,
])("rejects untrusted return destination %s", (destination) => {
  expect(safeReturn(destination)).toBe("/browse");
});
it("retains a known private destination and save intent", () => {
  window.location.hash = "/watchlist";
  requireLogin(42);
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  expect(params.get("returnTo")).toBe("/watchlist");
  expect(params.get("save")).toBe("42");
});
it("retains validated browse filters through login", () => {
  window.history.replaceState(
    null,
    "",
    "#/browse?location=Richmond&min_bedrooms=3&page=2",
  );
  requireLogin(42);
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  expect(params.get("returnTo")).toBe(
    "/browse?location=Richmond&min_bedrooms=3&page=2",
  );
});
it.each([
  "/browse?redirect=https://evil.test",
  "/browse?page=0",
  "/browse?page=2&page=3",
  "/browse?property_type=castle",
  "/browse?min_price=100&max_price=1",
  "/browse?location=" + "x".repeat(201),
])("rejects unsupported browse query %s", (value) => {
  expect(safeReturn(value)).toBe("/browse");
});
