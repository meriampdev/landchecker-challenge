import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderQuery, exampleProperty } from "../test/render";
import { AuthProvider } from "../features/auth";
import { App } from "./App";
import * as auth from "../features/auth/api";
import * as watches from "../features/watchlist/api";
import { search } from "../features/properties/api";
import { ApiError } from "../shared/http";
jest.mock("../features/auth/api");
jest.mock("../features/watchlist/api");
jest.mock("../features/properties/api");
jest.mock("./LiveUpdates", () => ({ LiveUpdates: () => null }));
beforeEach(() => {
  jest.resetAllMocks();
  sessionStorage.clear();
  window.history.replaceState(
    null,
    "",
    "#/browse?location=Richmond&min_bedrooms=3&page=2",
  );
  jest.mocked(auth.csrf).mockResolvedValue({ csrf_token: "anonymous" });
  jest.mocked(auth.me).mockRejectedValue(new ApiError(401, "Please log in"));
  const result = {
    user: { id: 1, email: "alex@example.com" },
    csrf_token: "signed-in",
  };
  jest.mocked(auth.login).mockResolvedValue(result);
  jest.mocked(auth.register).mockResolvedValue(result);
  jest
    .mocked(search)
    .mockImplementation(async (_filters, page) => ({
      properties: [exampleProperty],
      meta: { page, per_page: 12, total_count: 24, total_pages: 2 },
    }));
  jest
    .mocked(watches.getWatchlist)
    .mockResolvedValue({ properties: [exampleProperty] });
  jest
    .mocked(watches.changeWatch)
    .mockResolvedValue({ property: exampleProperty });
});
it.each([false, true])(
  "returns to the filtered page after anonymous save and authentication (register=%s)",
  async (register) => {
    const user = userEvent.setup();
    renderQuery(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    const save = await screen.findByRole("button", { name: "Save property 1" });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    await screen.findByRole("heading", { name: "Log in to save properties" });
    if (register)
      await user.click(screen.getByRole("link", { name: "Create an account" }));
    await user.type(await screen.findByLabelText("Email"), "alex@example.com");
    await user.type(
      screen.getByLabelText("Password", { exact: true }),
      "DemoPassword123!",
    );
    if (register)
      await user.type(
        screen.getByLabelText("Confirm password"),
        "DemoPassword123!",
      );
    await user.click(
      screen.getByRole("button", {
        name: register ? "Create account" : "Log in",
      }),
    );
    await waitFor(() =>
      expect(window.location.hash).toBe(
        "#/browse?location=Richmond&min_bedrooms=3&page=2",
      ),
    );
    expect(watches.changeWatch).toHaveBeenCalledWith(1, false, "signed-in");
    expect(
      await screen.findByRole("button", { name: "Remove property 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      jest
        .mocked(search)
        .mock.calls.every(
          ([filters, page]) =>
            filters.location === "Richmond" &&
            filters.min_bedrooms === "3" &&
            page === 2,
        ),
    ).toBe(true);
    await user.click(screen.getByRole("link", { name: "♡ Watchlist" }));
    await screen.findByRole("heading", { name: "Your watchlist." });
    await user.click(screen.getByRole("link", { name: "Explore homes" }));
    await waitFor(() =>
      expect(window.location.hash).toContain(
        "location=Richmond&min_bedrooms=3&page=2",
      ),
    );
    act(() => {
      window.history.replaceState(null, "", "#/browse?location=Carlton&page=1");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        { location: "Carlton" },
        1,
        expect.any(AbortSignal),
      ),
    );
  },
);
