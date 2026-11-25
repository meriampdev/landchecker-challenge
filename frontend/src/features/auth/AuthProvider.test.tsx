import { useState } from "react";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderQuery } from "../../test/render";
import { AuthProvider, useAuth } from "./AuthProvider";
import * as api from "./api";
import { ApiError } from "../../shared/http";
jest.mock("./api");
function Probe({ request }: { request: () => Promise<string> }) {
  const auth = useAuth();
  const [result, setResult] = useState("");
  return (
    <>
      <p>{auth.ready ? "Ready" : "Starting"}</p>
      <p>{auth.user?.email ?? "Anonymous"}</p>
      <p>{result}</p>
      <button
        onClick={() => void auth.login("alex@example.com", "DemoPassword123!")}
      >
        Sign in
      </button>
      <button onClick={() => void auth.logout()}>Sign out</button>
      <button
        onClick={() =>
          void auth
            .mutate(request)
            .then(setResult)
            .catch((error: Error) => setResult(error.message))
        }
      >
        Private request
      </button>
    </>
  );
}
afterEach(() => jest.resetAllMocks());
it("rejects a private response that arrives after logout", async () => {
  jest.mocked(api.csrf).mockResolvedValue({ csrf_token: "anonymous" });
  jest.mocked(api.me).mockRejectedValue(new ApiError(401, "Please log in."));
  jest.mocked(api.login).mockResolvedValue({
    user: { id: 1, email: "alex@example.com" },
    csrf_token: "signed-in",
  });
  jest.mocked(api.logout).mockResolvedValue({ csrf_token: "logged-out" });
  let resolve: (value: string) => void = () => {};
  const request = jest.fn(
    () =>
      new Promise<string>((done) => {
        resolve = done;
      }),
  );
  renderQuery(
    <AuthProvider>
      <Probe request={request} />
    </AuthProvider>,
  );
  await screen.findByText("Ready");
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("alex@example.com");
  await user.click(screen.getByRole("button", { name: "Private request" }));
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  await screen.findByText("Anonymous");
  await act(async () => resolve("Prior user private result"));
  expect(
    await screen.findByText("Session changed. Please retry."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Prior user private result"),
  ).not.toBeInTheDocument();
});
