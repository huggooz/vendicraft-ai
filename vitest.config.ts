// Standalone from vite.config.ts on purpose: that file goes through
// @lovable.dev/vite-tanstack-config's tanstackStart/nitro plugin chain,
// which does SSR/route-tree codegen this project's unit tests don't need
// and isn't meant to run under a plain Node test runner. This config only
// resolves the `@` path alias (via tsconfig) so tests can import app code.
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
