// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

function eventsPolyfillPlugin() {
  const eventsPath = path.resolve("node_modules/events/events.js");
  return {
    name: "events-polyfill",
    enforce: "pre" as const,
    resolveId(id: string) {
      if (id === "events" || id === "node:events") {
        return eventsPath;
      }
      return null;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [eventsPolyfillPlugin()],
    resolve: {
      alias: {
        events: path.resolve("node_modules/events/events.js"),
      },
    },
    ssr: {
      external: ["@neondatabase/auth", "@neondatabase/auth/react/adapters"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) {
                return "vendor-react";
              }
              if (id.includes("@radix-ui")) {
                return "vendor-radix";
              }
              if (id.includes("lucide-react")) {
                return "vendor-icons";
              }
            }
            return undefined;
          },
        },
      },
    },
  },
});
