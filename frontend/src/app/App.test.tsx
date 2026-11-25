import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { useAuth } from "../features/auth";
jest.mock("../features/auth", () => ({
  useAuth: jest.fn(),
  LoginForm: () => <p>Login form</p>,
}));
jest.mock("../features/properties", () => ({
  PropertyList: () => <p>Public properties</p>,
}));
jest.mock("../features/watchlist", () => ({
  SaveButton: () => null,
  WatchlistPage: () => <p>Private watches</p>,
  ResumeSave: () => null,
}));
jest.mock("./LiveUpdates", () => ({ LiveUpdates: () => null }));
beforeEach(() => {
  window.location.hash = "/browse";
});
it("hides private content when identity is cleared", async () => {
  const logout = jest.fn().mockResolvedValue(undefined);
  jest.mocked(useAuth).mockReturnValue({
    ready: true,
    user: { id: 1, email: "alex@example.com" },
    generation: 1,
    error: "",
    logout,
  } as unknown as ReturnType<typeof useAuth>);
  const view = render(<App />);
  await userEvent.click(screen.getByRole("link", { name: "♡ Watchlist" }));
  expect(await screen.findByText("Private watches")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(logout).toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.getByText("Public properties")).toBeVisible(),
  );
  jest.mocked(useAuth).mockReturnValue({
    ready: true,
    user: null,
    generation: 2,
    error: "",
  } as ReturnType<typeof useAuth>);
  view.rerender(<App />);
  expect(screen.queryByText("Private watches")).not.toBeInTheDocument();
  expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
});

it("keeps public browsing available and opens a dedicated login page", async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ ready: true, user: null, error: "" } as ReturnType<
      typeof useAuth
    >);
  render(<App />);
  expect(screen.getByText("Public properties")).toBeVisible();
  expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("link", { name: "Log in" }));
  expect(await screen.findByText("Login form")).toBeVisible();
  expect(screen.getByText("Public properties")).not.toBeVisible();
});
it("redirects anonymous private navigation to login with a safe return", async () => {
  window.location.hash = "/watchlist";
  jest
    .mocked(useAuth)
    .mockReturnValue({ ready: true, user: null, error: "" } as ReturnType<
      typeof useAuth
    >);
  render(<App />);
  expect(await screen.findByText("Login form")).toBeVisible();
  expect(
    new URLSearchParams(window.location.hash.split("?")[1]).get("returnTo"),
  ).toBe("/watchlist");
  expect(screen.queryByText("Private watches")).not.toBeInTheDocument();
});
