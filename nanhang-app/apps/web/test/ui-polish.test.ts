import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Disclosure } from "../src/disclosure.js";
import { prefersReducedMotion } from "../src/motion.js";
import { initialState, type WebForm } from "../src/model.js";
import { renderSail } from "../src/chapters/sail.js";
import { initialQualityState } from "../src/chapters/shared.js";

afterEach(() => vi.unstubAllGlobals());

describe("选填目标分不抵扣必填选科", () => {
  it.each([null, 0, 600])("目标分 %s 时，必填缺项仍由两组选科决定", (score) => {
    for (const primary of [null, "PHYSICS"] as const) {
      for (const additional of [[], ["CHEMISTRY"], ["CHEMISTRY", "BIOLOGY"]] as WebForm["additional"][]) {
        function Page() {
          const state = initialState();
          state.form = { ...state.form, primary, additional, score };
          return renderSail({ state, setState: vi.fn(), page: "sail", setPage: vi.fn(),
            quality: initialQualityState, setShowKun: vi.fn(), setToast: vi.fn(), toast: null,
            route: "manual", chooseRoute: vi.fn() });
        }
        const missing = Number(primary === null) + Number(additional.length !== 2);
        const html = renderToStaticMarkup(createElement(Page));
        expect(html).toContain(missing === 0 ? "可以出发" : `还差 ${missing} 件必填`);
        expect(html).not.toContain("还差 0 件");
      }
    }
  });
});

describe("抽屉初始语义", () => {
  it("初始关闭时不挂载院校卡，并从焦点和阅读顺序移除正文", () => {
    const html = renderToStaticMarkup(createElement(Disclosure, { id: "test", open: false, children: "院校正文" }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert=""');
    expect(html).not.toContain("院校正文");
  });
  it("初始打开时正文可访问", () => {
    const html = renderToStaticMarkup(createElement(Disclosure, { id: "test", open: true, children: "院校正文" }));
    expect(html).toContain("院校正文");
    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toContain("inert=");
  });
});

describe("界面动效偏好", () => {
  it.each([[false, false, false], [false, true, true], [true, false, true], [true, true, true]])(
    "系统减少动效 %s / 手动关闭 %s => %s", (system, off, expected) => {
      vi.stubGlobal("window", { matchMedia: () => ({ matches: system }) });
      vi.stubGlobal("document", { documentElement: { dataset: { motion: off ? "off" : undefined } } });
      expect(prefersReducedMotion()).toBe(expected);
    }
  );
  it("无 DOM 时可以安全渲染", () => expect(prefersReducedMotion()).toBe(false));
});
