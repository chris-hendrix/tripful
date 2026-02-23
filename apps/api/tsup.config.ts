import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "dist",
  format: "esm",
  target: "node22",
  platform: "node",
  splitting: false,
  clean: true,
  // Don't bundle node_modules — they're installed on Railway
  noExternal: [/^@tripful\/shared/],
  // Resolve path aliases
  esbuildOptions(options) {
    options.alias = {
      "@": "./src",
    };
  },
});
