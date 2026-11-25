import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // The browser reaches Vite and its HMR WebSocket through this published port.
    hmr: { clientPort: 5173 },
    watch: {
      usePolling: process.env.VITE_USE_POLLING === "true",
    },
    proxy: {
      "/api": { target: "http://backend:3000", changeOrigin: false },
      "/cable": {
        target: "http://backend:3000",
        ws: true,
        changeOrigin: false,
      },
    },
  },
});
