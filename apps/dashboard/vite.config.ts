import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/f": "http://127.0.0.1:5174",
      "/intake": {
        target: "http://127.0.0.1:8787",
        rewrite: (path) => path.replace(/^\/intake/, ""),
      },
    },
  },
  build: { sourcemap: true },
});
