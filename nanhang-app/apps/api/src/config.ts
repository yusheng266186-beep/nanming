// TASK-08: runtime configuration for the API adapter.
//
// Environment variables carry names and purposes only; no secret values live in the repository.
import { DEFAULT_CONFIG, qianfanOptionsFromEnv, withConfig, type AiGatewayConfig } from "@nanhang/ai-gateway";

export const ENV_NAMES = {
  profile: "NANHANG_AI_PROFILE",
  port: "NANHANG_API_PORT",
  trialCode: "NANHANG_TRIAL_ACCESS_CODE",
  upstream: "NANHANG_AI_UPSTREAM",
  fakeScenario: "NANHANG_FAKE_SCENARIO",
  academicBinding: "NANHANG_ACADEMIC_BINDING",
  // 千帆的变量名与北辰保持一致，两套系统可以共用同一份凭据说明。
  qianfanApiKey: "QIANFAN_API_KEY",
  qianfanBaseUrl: "QIANFAN_BASE_URL",
  qianfanModel: "QIANFAN_MODEL",
  qianfanThinking: "QIANFAN_THINKING",
  qianfanThinkingBudget: "QIANFAN_THINKING_BUDGET",
  qianfanMaxTokens: "QIANFAN_MAX_TOKENS",
  firstByteTimeoutMs: "NANHANG_AI_FIRST_BYTE_TIMEOUT_MS",
  totalTimeoutMs: "NANHANG_AI_TOTAL_TIMEOUT_MS"
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

/**
 * 思考档位决定等待上限。默认档是 deep（质量优先），模型要想完才开始出字，
 * 首字节 30 秒的默认上限会把每一轮都掐断，所以这里按档位给不同的默认值；
 * 显式设置 NANHANG_AI_FIRST_BYTE_TIMEOUT_MS / NANHANG_AI_TOTAL_TIMEOUT_MS 仍然优先。
 */
function timeoutDefaults(env: NodeJS.ProcessEnv): { firstByte: number; total: number } {
  const thinking = qianfanOptionsFromEnv(env)?.thinking === "enabled";
  return thinking
    ? { firstByte: 120000, total: 300000 }
    : { firstByte: DEFAULT_CONFIG.firstByteTimeoutMs, total: DEFAULT_CONFIG.totalTimeoutMs };
}

export function loadRuntimeConfig(overrides: Partial<AiGatewayConfig> & { port?: number } = {}, env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const profile = (env[ENV_NAMES.profile] === "production" ? "production" : "development") as AiGatewayConfig["profile"];
  const timeouts = timeoutDefaults(env);
  return {
    ...withConfig({
      profile,
      firstByteTimeoutMs: intFromEnv(env, ENV_NAMES.firstByteTimeoutMs, timeouts.firstByte),
      totalTimeoutMs: intFromEnv(env, ENV_NAMES.totalTimeoutMs, timeouts.total),
      ...overrides
    }),
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
