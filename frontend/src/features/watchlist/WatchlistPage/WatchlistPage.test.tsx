import { render, screen } from "@testing-library/react";
import { WatchlistPage } from "./WatchlistPage";
import { useWatchlist } from "../queries";
jest.mock("../queries");
it("explains an empty watchlist", () => {
  jest.mocked(useWatchlist).mockReturnValue({
    data: { properties: [] },
    isPending: false,
    isError: false,
  } as ReturnType<typeof useWatchlist>);
  render(<WatchlistPage />);
  expect(screen.getByText(/No saved properties yet/)).toBeInTheDocument();
});
