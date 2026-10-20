import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: "127.0.0.1", port: 5180, strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8010", rewrite: path => path.replace(/^\/api/, "") } },
  },
});
