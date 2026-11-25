import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertyFilters } from "./PropertyFilters";
it("applies inclusive inputs and clears them explicitly", async () => {
  const apply = jest.fn();
  render(<PropertyFilters onApply={apply} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Location"), "Richmond");
  await user.type(screen.getByLabelText("Minimum price (AUD)"), "950000");
  await user.selectOptions(screen.getByLabelText("Property type"), "house");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(apply).toHaveBeenLastCalledWith({
    location: "Richmond",
    min_price: "950000",
    property_type: "house",
  });
  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(apply).toHaveBeenLastCalledWith({});
  expect(screen.getByLabelText("Location")).toHaveValue("");
});
