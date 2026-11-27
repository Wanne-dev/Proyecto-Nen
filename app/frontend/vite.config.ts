import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Divide las librerías grandes en chunks separados para mejorar el
    // primer render y evitar el warning de bundle > 500 kB.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          lightweight: ["lightweight-charts"],
          recharts: ["recharts"],
          motion: ["framer-motion"],
          state: ["zustand"],
        },
      },
    },
  },
});
