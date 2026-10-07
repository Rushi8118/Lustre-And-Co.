import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    strictPort: true,
  },
  build: {
    // three-vendor is knowingly large and lazy-loaded; warn only above it so a
    // genuine regression in the app chunks still trips the check.
    chunkSizeWarningLimit: 950,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion")) return "motion";
          // three + its helpers are ~900 kB and only the lazy homepage hero needs
          // them. Keeping them in one long-lived chunk means app releases don't
          // re-download them, and no other route pays for them at all.
          if (id.includes("/three/") || id.includes("@react-three")) return "three-vendor";
          if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
