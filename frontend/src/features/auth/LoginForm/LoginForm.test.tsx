import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { useAuth } from "../AuthProvider";
jest.mock("../AuthProvider");
it("reports rejected credentials and permits retry", async () => {
  const login = jest
    .fn()
    .mockRejectedValue(new Error("Email or password is incorrect."));
  jest
    .mocked(useAuth)
    .mockReturnValue({ ready: true, login } as unknown as ReturnType<
      typeof useAuth
    >);
  render(<LoginForm />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "alex@example.com");
  await user.type(screen.getByLabelText("Password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Log in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Email or password is incorrect.",
  );
  expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
});
