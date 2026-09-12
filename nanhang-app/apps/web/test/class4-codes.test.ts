import { expect, it } from "vitest";
import { normalizeCode } from "../src/quality-huixi.js";

it("查询码保留前导零，身份证末位X由学生按0输入", () => {
  expect(normalizeCode("012340")).toBe("012340");
  expect(normalizeCode("01234x")).toBeNull();
  expect(normalizeCode("001234")).toBe("001234");
  expect(normalizeCode("01A2345")).toBeNull();
  expect(normalizeCode("X12345")).toBeNull();
});
