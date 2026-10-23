import type { HubConfigInput } from "../schemas/hub-config.ts";

export { brandHub } from "./integration/index.ts";
export type { HubConfig, HubConfigInput, ModuleId } from "../schemas/hub-config.ts";

/** Typed identity helper for hub.config.ts. Validation happens when the integration loads it. */
export function defineHub(config: HubConfigInput): HubConfigInput {
  return config;
}
