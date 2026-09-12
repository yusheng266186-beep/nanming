// TASK-08: local API entry point. Development only, no deployment.
import { createApiServer, buildDemoGateway } from "./server.ts";
import { loadRuntimeConfig, productionGuard, ENV_NAMES } from "./config.ts";

const config = loadRuntimeConfig();
let built: ReturnType<typeof buildDemoGateway>;
try {
  built = buildDemoGateway();
} catch (error) {
  // 配置写错（例如要求千帆却缺密钥、或端点不在允许名单）时直接停住，不带着半个配置对外服务。
  console.error(`refusing to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const { gateway, store } = built;
const guard = productionGuard(config, store.kind);
if (!guard.ok) {
  console.error(`refusing to start: ${guard.reason}`);
  process.exit(1);
}
const server = createApiServer({ gateway });

/**
 * 端口与监听地址。云函数（SCF Web 函数）会注入 PORT，并要求监听 0.0.0.0；
 * 本地开发没有 PORT，就继续只听 127.0.0.1，不把开发服务暴露到局域网。
 */
const injectedPort = Number(process.env.PORT ?? "");
const listeningPort = Number.isFinite(injectedPort) && injectedPort > 0 ? Math.floor(injectedPort) : config.port;
const listeningHost = Number.isFinite(injectedPort) && injectedPort > 0 ? "0.0.0.0" : "127.0.0.1";

server.listen(listeningPort, listeningHost, () => {
  console.log(JSON.stringify({
    status: "listening", url: `http://${listeningHost}:${listeningPort}`, profile: config.profile,
    upstream: gateway.readiness().upstream, ai: gateway.readiness().ai,
    hint: [
      `真模型：${ENV_NAMES.upstream}=qianfan + ${ENV_NAMES.qianfanApiKey} + ${ENV_NAMES.qianfanModel}`,
      `假上游场景：${ENV_NAMES.fakeScenario}=timeout|fail-after-text|unsafe-output|probability-output|link-output|empty-output`,
      `开启思考档位后请同时放宽 ${ENV_NAMES.firstByteTimeoutMs} / ${ENV_NAMES.totalTimeoutMs}`
    ].join("；")
  }));
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { server.close(() => process.exit(0)); });
}
