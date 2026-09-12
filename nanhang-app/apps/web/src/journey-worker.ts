import { buildSchoolPool } from "./journey-model.js";
self.onmessage = async (
  event: MessageEvent<Parameters<typeof buildSchoolPool>>,
) => {
  try {
    self.postMessage({ ok: true, pool: await buildSchoolPool(...event.data) });
  } catch (error) {
    self.postMessage({
      ok: false,
      message: error instanceof Error ? error.message : "匹配未完成，请重试。",
    });
  }
};
