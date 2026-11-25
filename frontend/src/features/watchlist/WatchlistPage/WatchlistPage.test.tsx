import { screen } from "@testing-library/react";
import { renderQuery } from "../../../test/render";
import { WatchlistPage } from "./WatchlistPage";
import { getWatchlist } from "../api";
import { useAuth } from "../../auth";
jest.mock("../api");
jest.mock("../../auth");
it("explains an empty watchlist", async () => {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "alex@example.com" },
    ready: true,
    error: "",
    generation: 1,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    mutate: (fn) => fn("token"),
  });
  jest.mocked(getWatchlist).mockResolvedValue({ properties: [] });
  renderQuery(<WatchlistPage />);
  expect(
    await screen.findByText(/No saved properties yet/),
  ).toBeInTheDocument();
});
