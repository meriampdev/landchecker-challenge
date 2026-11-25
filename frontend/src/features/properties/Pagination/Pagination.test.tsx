import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, pageItems } from "./Pagination";

it("includes boundaries and nearby pages with non-interactive gaps", () => {
  expect(pageItems(1, 20, 1)).toEqual([1, 2, "gap-2", 20]);
  expect(pageItems(10, 20, 1)).toEqual([1, "gap-1", 9, 10, 11, "gap-11", 20]);
  expect(pageItems(20, 20, 1)).toEqual([1, "gap-1", 19, 20]);
  expect(pageItems(10, 20, 0)).toEqual([1, "gap-1", 10, "gap-10", 20]);
});
it("shows actual totals, marks the current page, and supports keyboard navigation", async () => {
  const onChange = jest.fn();
  render(
    <Pagination
      page={10}
      pages={20}
      total={235}
      perPage={12}
      onChange={onChange}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Showing 109–120 of 235 results",
  );
  const nav = screen.getByRole("navigation");
  expect(
    within(nav).getAllByRole("button", { name: "Page 10" })[0],
  ).toHaveAttribute("aria-current", "page");
  screen.getByRole("button", { name: "Next" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledWith(11);
});
it("disables boundary controls and clamps the last summary to the total", () => {
  const props = { pages: 3, total: 25, perPage: 12, onChange: jest.fn() };
  const { rerender } = render(<Pagination {...props} page={1} />);
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  rerender(<Pagination {...props} page={3} />);
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Showing 25–25 of 25 results",
  );
  rerender(<Pagination {...props} page={1} pages={1} total={5} />);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Showing 1–5 of 5 results",
  );
  rerender(<Pagination {...props} page={1} pages={0} total={0} />);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Showing 0–0 of 0 results",
  );
});
