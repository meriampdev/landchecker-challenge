import { act, renderHook } from "@testing-library/react";
import { createConsumer } from "@rails/actioncable";
import {
  useWatchlistSubscription,
  validChange,
} from "./useWatchlistSubscription";
jest.mock("@rails/actioncable");
it("validates event payloads and rejects unsafe amounts", () => {
  expect(
    validChange({
      type: "property.updated",
      property: {
        id: 1,
        price_cents: 100,
        status: "sold",
        updated_at: "2026-11-25T08:00:00Z",
      },
    }),
  ).toBe(true);
  expect(
    validChange({
      type: "property.updated",
      property: { id: 1, price_cents: -1, status: "sold", updated_at: "bad" },
    }),
  ).toBe(false);
});
it("disconnects on cleanup and ignores late transport callbacks", () => {
  let callbacks: { received: (event: unknown) => void };
  const unsubscribe = jest.fn(),
    disconnect = jest.fn();
  jest.mocked(createConsumer).mockReturnValue({
    disconnect,
    subscriptions: {
      create: jest.fn((_params, handlers) => {
        callbacks = handlers;
        return { unsubscribe };
      }),
    },
  } as unknown as ReturnType<typeof createConsumer>);
  const changed = jest.fn();
  const { unmount } = renderHook(() =>
    useWatchlistSubscription("1-0", changed, jest.fn()),
  );
  unmount();
  act(() =>
    callbacks.received({
      type: "property.updated",
      property: {
        id: 1,
        price_cents: 100,
        status: "sold",
        updated_at: "2026-11-25T08:00:00Z",
      },
    }),
  );
  expect(unsubscribe).toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
});
