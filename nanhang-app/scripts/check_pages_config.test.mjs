import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPagesConfig } from "./check_pages_config.mjs";
test("Pages only builds with both public HTTPS services configured", () => {
  const valid = { VITE_NANHANG_RELEASE_BASE: "https://data.example.com/releases", VITE_NANHANG_API_BASE: "https://api.example.com" };
  assert.doesNotThrow(() => checkPagesConfig(valid));
  for (const value of [undefined, "", "http://127.0.0.1:8790", "https://localhost", "https://192.168.1.1", "https://user:password@example.com"]) {
    assert.throws(() => checkPagesConfig({ ...valid, VITE_NANHANG_API_BASE: value }));
  }
  assert.throws(() => checkPagesConfig({ ...valid, VITE_NANHANG_RELEASE_BASE: "" }));
});
