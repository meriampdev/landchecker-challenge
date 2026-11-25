import { StrictMode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderQuery } from "../../test/render";
import { ResumeSave } from "./ResumeSave";
import { useAuth } from "../auth";
import { changeWatch } from "./api";
jest.mock("../auth");
jest.mock("./api");
beforeEach(() => {
  jest.resetAllMocks();
  window.location.hash = "/login";
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, email: "alex@example.com" },
    mutate: (fn: (token: string) => Promise<unknown>) => fn("token"),
  } as ReturnType<typeof useAuth>);
});
it("ensures a saved membership once under StrictMode without toggling it off", async () => {
  jest.mocked(changeWatch).mockResolvedValue(undefined);
  renderQuery(
    <StrictMode>
      <ResumeSave id={1} destination="/browse" />
    </StrictMode>,
  );
  await waitFor(() => expect(window.location.hash).toBe("#/browse"));
  expect(changeWatch).toHaveBeenCalledTimes(1);
  expect(changeWatch).toHaveBeenCalledWith(1, false, "token");
});
it("reports failures and permits explicit idempotent retry", async () => {
  jest
    .mocked(changeWatch)
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue(undefined);
  renderQuery(<ResumeSave id={1} destination="/watchlist" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  await userEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await waitFor(() => expect(window.location.hash).toBe("#/watchlist"));
  expect(changeWatch).toHaveBeenCalledTimes(2);
});
