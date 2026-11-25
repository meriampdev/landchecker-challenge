import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderQuery, exampleProperty } from "../../../test/render";
import { SaveButton } from "./SaveButton";
import { useAuth } from "../../auth";
import { useWatchlist } from "../queries";
import { changeWatch } from "../api";
jest.mock("../../auth");
jest.mock("../queries");
jest.mock("../api");
it("retains confirmed saved state when removal fails", async () => {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "alex@example.com" },
    mutate: (fn: (token: string) => Promise<unknown>) => fn("token"),
  } as ReturnType<typeof useAuth>);
  jest.mocked(useWatchlist).mockReturnValue({
    data: { properties: [exampleProperty] },
    isPending: false,
    isError: false,
  } as ReturnType<typeof useWatchlist>);
  jest
    .mocked(changeWatch)
    .mockRejectedValue(new Error("Could not save change"));
  renderQuery(<SaveButton id={1} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Remove property 1" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not save change",
  );
  expect(
    screen.getByRole("button", { name: "Remove property 1" }),
  ).toHaveAttribute("aria-pressed", "true");
});
it("redirects anonymous saving with the intended property and return page", async () => {
  window.location.hash = "/browse";
  jest
    .mocked(useAuth)
    .mockReturnValue({ user: null, ready: true } as ReturnType<typeof useAuth>);
  jest
    .mocked(useWatchlist)
    .mockReturnValue({ isPending: true } as ReturnType<typeof useWatchlist>);
  renderQuery(<SaveButton id={42} />);
  await userEvent.click(
    screen.getByRole("button", { name: "Save property 42" }),
  );
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  expect(window.location.hash).toContain("/login?");
  expect(params.get("save")).toBe("42");
  expect(params.get("returnTo")).toBe("/browse");
});
