// TASK-08: local API entry point. Development only, no deployment.
import { createApiServer, buildDemoGateway } from "./server.ts";
import { loadRuntimeConfig, productionGuard, ENV_NAMES } from "./config.ts";

const config = loadRuntimeConfig();
const { gateway, store } = buildDemoGateway();
const guard = productionGuard(config, store.kind);
if (!guard.ok) {
  console.error(`refusing to start: ${guard.reason}`);
  process.exit(1);
}
const server = createApiServer({ gateway });

server.listen(config.port, "127.0.0.1", () => {
  console.log(JSON.stringify({
    status: "listening", url: `http://127.0.0.1:${config.port}`, profile: config.profile,
    upstream: gateway.readiness().upstream, ai: gateway.readiness().ai,
    hint: `${ENV_NAMES.fakeScenario}=timeout|fail-after-text|unsafe-output|probability-output|link-output|empty-output`
  }));
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { server.close(() => process.exit(0)); });
}
