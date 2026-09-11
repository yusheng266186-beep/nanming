// TASK-08: runtime configuration for the API adapter.
//
// Environment variables carry names and purposes only; no secret values live in the repository.
import { withConfig, type AiGatewayConfig } from "@nanhang/ai-gateway";

export const ENV_NAMES = {
  profile: "NANHANG_AI_PROFILE",
  port: "NANHANG_API_PORT",
  trialCode: "NANHANG_TRIAL_ACCESS_CODE",
  upstream: "NANHANG_AI_UPSTREAM",
  fakeScenario: "NANHANG_FAKE_SCENARIO",
  academicBinding: "NANHANG_ACADEMIC_BINDING"
} as const;

export interface RuntimeConfig extends AiGatewayConfig {
  readonly port: number;
}

function intFromEnv(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function loadRuntimeConfig(overrides: Partial<AiGatewayConfig> & { port?: number } = {}, env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const profile = (env[ENV_NAMES.profile] === "production" ? "production" : "development") as AiGatewayConfig["profile"];
  return {
    ...withConfig({ profile, ...overrides }),
    port: overrides.port ?? intFromEnv(env, ENV_NAMES.port, 8790)
  };
}

/**
 * Production refuses the in-memory store, so `aiEnabled()` is false there until a real shared
 * store adapter is wired. That is deliberate: it is better to have AI off than to bill users
 * from per-instance memory (SYSTEM_AND_INTERFACE_SPEC.md section 8).
 */
export function productionGuard(config: AiGatewayConfig, storeKind: string): { readonly ok: boolean; readonly reason: string | null } {
  if (config.profile !== "production") return { ok: true, reason: null };
  if (storeKind === "memory") return { ok: false, reason: "production requires a shared state store; memory is refused" };
  return { ok: true, reason: null };
}
