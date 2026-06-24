// Browser stub for Node's "node:module" builtin. A transitive mermaid dependency
// (cytoscape-fcose) imports it for a Node-only code path that never runs in the
// browser, but rollup still tries to bundle it — which fails for a Node builtin.
// This stub satisfies the import; its exports are never actually used client-side.
export function createRequire() {
  return () => ({});
}

export default { createRequire };
