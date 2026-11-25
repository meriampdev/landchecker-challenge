import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
export function renderQuery(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
  };
}
export const exampleProperty = {
  id: 1,
  title: "Harbour View House",
  address: "10 Demo Street",
  suburb: "Richmond VIC 3121",
  property_type: "house" as const,
  price_cents: 95_000_000,
  bedrooms: 3,
  bathrooms: 2,
  parking_spaces: 1,
  status: "available" as const,
  image_path: "",
  updated_at: "2026-11-25T08:00:00.000000Z",
};
