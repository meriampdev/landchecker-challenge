import { act, screen, waitFor } from "@testing-library/react";
import { renderQuery, exampleProperty, querySuccess } from "../test/render";
import { LiveUpdates } from "./LiveUpdates";
import { useAuth } from "../features/auth";
import {
  useWatchlist,
  useWatchlistSubscription,
  type Change,
} from "../features/watchlist";
jest.mock("../features/auth");
jest.mock("../features/watchlist", () => ({
  ...jest.requireActual("../features/watchlist"),
  useWatchlist: jest.fn(),
  useWatchlistSubscription: jest.fn(),
}));
it("patches existing watched values and announces an incoming update", async () => {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "alex@example.com" },
    generation: 0,
    refresh: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>);
  jest
    .mocked(useWatchlist)
    .mockReturnValue(querySuccess({ properties: [exampleProperty] }));
  let received: (change: Change) => void = () => {};
  jest
    .mocked(useWatchlistSubscription)
    .mockImplementation((_identity, callback) => {
      received = callback;
      return { connected: true, retry: jest.fn() };
    });
  const { client } = renderQuery(<LiveUpdates />);
  client.setQueryData(["watchlist", 1, 0], { properties: [exampleProperty] });
  client.setQueryData(["properties", {}, 1], {
    properties: [exampleProperty],
    meta: { page: 1, per_page: 12, total_count: 1, total_pages: 1 },
  });
  await act(async () => {
    received({
      id: 1,
      price_cents: 96_000_000,
      status: "under_offer",
      updated_at: "2026-11-25T09:00:00.000000Z",
    });
  });
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "A watched property has a new price or status.",
    ),
  );
  await act(async () => {
    received({
      id: 1,
      price_cents: 1,
      status: "sold",
      updated_at: exampleProperty.updated_at,
    });
  });
  expect(
    client.getQueryData<{ properties: (typeof exampleProperty)[] }>([
      "properties",
      {},
      1,
    ])?.properties[0].price_cents,
  ).toBe(96_000_000);
});
