// file: frontend/vite.config.ts
// description: Vite Konfiguration fuer React.
// history:
// - 2026-03-25: Erstellt fuer Frontend Start und Build. author Marcus Schlieper
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
});
