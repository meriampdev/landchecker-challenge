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
