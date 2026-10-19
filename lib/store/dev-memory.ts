/** Shared in-process KV when Redis is not configured (survives duplicate module instances in dev). */
const STORE_KEY = "__tubecpDevMemory";

export function getDevMemoryStore(): Map<string, unknown> {
  const g = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, unknown>;
  };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY];
}
