/**
 * Loads the OpenFGA connection config (API URL + store id + model id).
 *
 * Resolution order:
 *   1. Environment variables (FGA_API_URL / FGA_STORE_ID / FGA_MODEL_ID)
 *   2. ./fga.local.json written by `deno task seed`
 */
export interface FgaConfig {
  apiUrl: string;
  storeId: string;
  modelId: string;
}

const LOCAL_FILE = new URL("../fga.local.json", import.meta.url);

let cached: FgaConfig | null = null;

export async function loadFgaConfig(): Promise<FgaConfig> {
  if (cached) return cached;

  const apiUrl = Deno.env.get("FGA_API_URL");
  const storeId = Deno.env.get("FGA_STORE_ID");
  const modelId = Deno.env.get("FGA_MODEL_ID");
  if (apiUrl && storeId && modelId) {
    cached = { apiUrl, storeId, modelId };
    return cached;
  }

  try {
    const text = await Deno.readTextFile(LOCAL_FILE);
    const parsed = JSON.parse(text) as Partial<FgaConfig>;
    if (!parsed.apiUrl || !parsed.storeId || !parsed.modelId) {
      throw new Error("fga.local.json is missing apiUrl/storeId/modelId");
    }
    cached = parsed as FgaConfig;
    return cached;
  } catch (err) {
    throw new Error(
      "OpenFGA is not configured. Run `docker compose up -d` then `deno task seed`.\n" +
        `(could not read ${LOCAL_FILE.pathname}: ${
          err instanceof Error ? err.message : String(err)
        })`,
    );
  }
}

export function writeFgaConfig(cfg: FgaConfig): Promise<void> {
  cached = cfg;
  return Deno.writeTextFile(LOCAL_FILE, JSON.stringify(cfg, null, 2) + "\n");
}
