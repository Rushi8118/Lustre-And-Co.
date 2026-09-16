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
        // Stable chunks for libraries every page needs, so browsers keep them cached across deploys.
        // three.js is deliberately not named here: forcing it into a shared chunk makes the entry
        // preload it. Left alone, Rollup keeps it with the lazily loaded 3D hero.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "vendor-motion";
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
});
