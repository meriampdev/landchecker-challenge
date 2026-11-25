import { useEffect, useRef, useState } from "react";
import { createConsumer } from "@rails/actioncable";
import type { Property } from "../properties";
export type Change = Pick<
  Property,
  "id" | "price_cents" | "status" | "updated_at"
>;
export function validChange(
  data: unknown,
): data is { type: "property.updated"; property: Change } {
  if (!data || typeof data !== "object") return false;
  const event = data as { type?: unknown; property?: Partial<Change> };
  const p = event.property;
  return (
    event.type === "property.updated" &&
    !!p &&
    Number.isSafeInteger(p.id) &&
    Number(p.id) > 0 &&
    Number.isSafeInteger(p.price_cents) &&
    Number(p.price_cents) >= 0 &&
    ["available", "under_offer", "sold"].includes(String(p.status)) &&
    typeof p.updated_at === "string" &&
    Number.isFinite(Date.parse(p.updated_at))
  );
}
export function useWatchlistSubscription(
  identity: string,
  onChange: (change: Change) => void,
  onReconnect: () => void,
) {
  const callbacks = useRef({ onChange, onReconnect });
  callbacks.current = { onChange, onReconnect };
  const [connected, setConnected] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const consumer = createConsumer(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/cable`,
    );
    const subscription = consumer.subscriptions.create(
      { channel: "WatchlistChannel" },
      {
        connected() {
          if (active) {
            setConnected(true);
            callbacks.current.onReconnect();
          }
        },
        disconnected() {
          if (active) {
            setConnected(false);
            callbacks.current.onReconnect();
          }
        },
        rejected() {
          if (active) {
            setConnected(false);
            callbacks.current.onReconnect();
          }
        },
        received(data: unknown) {
          if (active && validChange(data))
            callbacks.current.onChange(data.property);
        },
      },
    );
    return () => {
      active = false;
      subscription.unsubscribe();
      consumer.disconnect();
    };
  }, [identity, attempt]);
  return {
    connected,
    retry: () => {
      setConnected(false);
      setAttempt((n) => n + 1);
    },
  };
}
