import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
  resolve: {
    alias: [
      // mermaid → cytoscape-fcose imports node:module for a Node-only path that
      // never runs in the browser; stub it so the client bundle can build.
      {
        find: "node:module",
        replacement: new URL("./lib/node-module-stub.ts", import.meta.url)
          .pathname,
      },
      // dayjs (a mermaid dep) only declares a CommonJS "main", which the dev
      // server serves without a default export. Point bare "dayjs" at its ESM
      // build so the default import works.
      { find: /^dayjs$/, replacement: "dayjs/esm/index.js" },
    ],
  },
});
