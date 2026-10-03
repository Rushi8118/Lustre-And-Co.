import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("three") || id.includes("@react-three")) return "three";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
