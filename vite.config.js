import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const page = (name) => fileURLToPath(new URL(`./site/${name}.html`, import.meta.url));

export default defineConfig({
  root: "site",
  base: "./",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: page("index"),
        vehicles: page("vehicles"),
        missions: page("missions"),
        company: page("company"),
      },
    },
  },
});
