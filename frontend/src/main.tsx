import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./features/auth";
import { App } from "./app/App";
import "./app/global.css";
const client = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>,
);
