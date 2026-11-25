import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderQuery, exampleProperty } from "../../../test/render";
import { PropertyList } from "./PropertyList";
import { search } from "../api";
jest.mock("../api");
const mockedSearch = jest.mocked(search);
beforeEach(() => window.history.replaceState(null, "", "#/browse"));
afterEach(() => jest.resetAllMocks());
it("retains network pagination and resets to page one when applying filters", async () => {
  mockedSearch.mockResolvedValue({
    properties: [exampleProperty],
    meta: { page: 1, per_page: 12, total_count: 24, total_pages: 2 },
  });
  renderQuery(<PropertyList action={() => null} />);
  const user = userEvent.setup();
  expect(await screen.findByText("Harbour View House")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(mockedSearch).toHaveBeenLastCalledWith(
      {},
      2,
      expect.any(AbortSignal),
    ),
  );
  await user.type(screen.getByLabelText("Minimum bedrooms"), "3");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() =>
    expect(mockedSearch).toHaveBeenLastCalledWith(
      { min_bedrooms: "3" },
      1,
      expect.any(AbortSignal),
    ),
  );
});
it("shows a retryable failure followed by an empty result", async () => {
  mockedSearch
    .mockRejectedValueOnce(new Error("Network unavailable"))
    .mockResolvedValue({
      properties: [],
      meta: { page: 1, per_page: 12, total_count: 0, total_pages: 0 },
    });
  renderQuery(<PropertyList action={() => null} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Network unavailable",
  );
  await userEvent.click(screen.getByRole("button", { name: "Retry search" }));
  expect(
    await screen.findByText("No properties match these filters."),
  ).toBeInTheDocument();
});

it("restores filters and page from URLs and responds to browser navigation", async () => {
  window.history.replaceState(null, "", "#/browse?location=Richmond&page=3");
  mockedSearch.mockImplementation(async (_filters, page) => ({
    properties: [exampleProperty],
    meta: { page, per_page: 12, total_count: 100, total_pages: 9 },
  }));
  renderQuery(<PropertyList action={() => null} />);
  expect(
    await screen.findByText("Showing 25–36 of 100 results"),
  ).toBeInTheDocument();
  expect(screen.getByRole("searchbox")).toHaveValue("Richmond");
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(window.location.hash).toContain("location=Richmond&page=4"),
  );
  window.history.replaceState(null, "", "#/browse?location=Richmond&page=2");
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  expect(
    await screen.findByText("Showing 13–24 of 100 results"),
  ).toBeInTheDocument();
});
it.each(["-1", "abc", "1.5", "999999999999999999999"])(
  "normalizes invalid page %s",
  async (value) => {
    window.history.replaceState(null, "", `#/browse?page=${value}`);
    mockedSearch.mockResolvedValue({
      properties: [],
      meta: { page: 1, per_page: 12, total_count: 0, total_pages: 0 },
    });
    renderQuery(<PropertyList action={() => null} />);
    await screen.findByText("No properties match these filters.");
    expect(mockedSearch).toHaveBeenCalledWith({}, 1, expect.any(AbortSignal));
    expect(window.location.hash).toBe("#/browse?page=1");
  },
);
it("corrects out-of-range pages using the API total", async () => {
  window.history.replaceState(null, "", "#/browse?page=99");
  mockedSearch.mockImplementation(async (_filters, page) => ({
    properties: page > 2 ? [] : [exampleProperty],
    meta: { page, per_page: 12, total_count: 13, total_pages: 2 },
  }));
  renderQuery(<PropertyList action={() => null} />);
  expect(
    await screen.findByText("Showing 13–13 of 13 results"),
  ).toBeInTheDocument();
  expect(window.location.hash).toBe("#/browse?page=2");
});

it("searches from the hero while retaining refinements and resetting pagination", async () => {
  window.history.replaceState(null, "", "#/browse?min_bedrooms=3&page=2");
  mockedSearch.mockResolvedValue({
    properties: [exampleProperty],
    meta: { page: 2, per_page: 12, total_count: 24, total_pages: 2 },
  });
  renderQuery(<PropertyList action={() => null} />);
  const user = userEvent.setup();
  await screen.findByText("Harbour View House");
  await user.type(screen.getByRole("searchbox"), "  Richmond  ");
  await user.click(screen.getByRole("button", { name: "Search homes" }));
  await waitFor(() =>
    expect(mockedSearch).toHaveBeenLastCalledWith(
      { location: "Richmond", min_bedrooms: "3" },
      1,
      expect.any(AbortSignal),
    ),
  );
  expect(screen.getByLabelText("Location")).toHaveValue("Richmond");
  await user.clear(screen.getByRole("searchbox"));
  await user.click(screen.getByRole("button", { name: "Search homes" }));
  await waitFor(() =>
    expect(mockedSearch).toHaveBeenLastCalledWith(
      { min_bedrooms: "3" },
      1,
      expect.any(AbortSignal),
    ),
  );
});
