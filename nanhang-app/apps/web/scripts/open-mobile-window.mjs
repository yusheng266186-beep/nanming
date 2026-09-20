// 手机端调试窗口：开一个「真机尺寸」的 Chromium 窗口（默认 390×844 / DPR 3 / 触摸），
// 让你在电脑上直接点手机版页面，而不是靠手动拉窗口宽度去凑。
//
// 为什么不能只用一个 --window-size：窗口尺寸包含浏览器自身的外框与工具栏，视口永远比
// 你填的数字小一截，凑不出准确的 390×844。所以这里先用 --remote-debugging-port 启动浏览器，
// 再用 CDP 的 Emulation.setDeviceMetricsOverride 把视口钉到设备尺寸，并打开触摸仿真
// （页面上有 @media(pointer:coarse) 与 :hover 分支，触摸与否表现不同）。
//
// 调试：窗口里按 F12 就是完整的 DevTools（含 Elements/Network/Console）；
// 想切别的机型，在 DevTools 左上角的设备工具栏里选即可（Ctrl+Shift+M）。
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = new Map();
for (const raw of process.argv.slice(2)) {
  const [key, value] = raw.replace(/^--/, "").split("=");
  args.set(key, value ?? "true");
}

/** 机型尺寸：命令行 `--width=320` 优先，其次环境变量（`npm run` 转发参数在部分 npm 版本上会丢）。 */
const pick = (key, envName, fallback) => args.get(key) ?? process.env[envName] ?? fallback;

const url = pick("url", "NANHANG_MOBILE_URL", "http://127.0.0.1:5173/");
const width = Number(pick("width", "NANHANG_MOBILE_WIDTH", 390));
const height = Number(pick("height", "NANHANG_MOBILE_HEIGHT", 844));
const dpr = Number(pick("dpr", "NANHANG_MOBILE_DPR", 3));
const port = Number(pick("port", "NANHANG_MOBILE_PORT", 9333));

const candidates = [
  process.env.NANHANG_CHROMIUM,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);

const executable = candidates.find((path) => existsSync(path));
if (!executable) {
  console.error("没找到 Chrome/Edge。用 NANHANG_CHROMIUM=<浏览器 exe 路径> 指定一个再跑。");
  process.exit(1);
}

// 独立用户目录：不碰你正在用的浏览器配置，也不因为你已开着浏览器而把新窗口塞进旧进程。
const profile = mkdtempSync(join(tmpdir(), "nanming-mobile-"));
const child = spawn(executable, [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--remote-allow-origins=*",
  "--no-first-run",
  "--no-default-browser-check",
  `--window-size=${width},${height + 120}`,
  url
], { detached: true, stdio: "ignore" });
child.unref();

const endpoint = `http://127.0.0.1:${port}/json/version`;
const deadline = Date.now() + 20000;
let version = null;
while (Date.now() < deadline) {
  try {
    const response = await fetch(endpoint);
    if (response.ok) { version = await response.json(); break; }
  } catch { /* 浏览器还没起来，继续等 */ }
  await new Promise((resolve) => setTimeout(resolve, 300));
}
if (!version) {
  console.error("浏览器起来了但调试端口没响应，请手动把窗口拉到手机宽度。");
  process.exit(1);
}

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
if (!page) {
  console.error("没有找到页面目标，请手动把窗口拉到手机宽度。");
  process.exit(1);
}

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const resolver = pending.get(message.id);
  if (!resolver) return;
  pending.delete(message.id);
  resolver(message.error ? { error: message.error } : { result: message.result });
});
const send = (method, params = {}) => new Promise((resolve) => {
  const messageId = ++id;
  pending.set(messageId, resolve);
  socket.send(JSON.stringify({ id: messageId, method, params }));
});

await send("Emulation.setDeviceMetricsOverride", {
  width, height, deviceScaleFactor: dpr, mobile: true,
  screenWidth: width, screenHeight: height,
  screenOrientation: { angle: 0, type: "portraitPrimary" }
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await send("Emulation.setEmitTouchEventsForMouse", { enabled: true, configuration: "mobile" });
await send("Page.reload", { ignoreCache: false });

console.log(`手机端调试窗口已打开：${executable}`);
console.log(`  机型尺寸 ${width}×${height} · DPR ${dpr} · 触摸仿真开 · 页面 ${url}`);
console.log(`  窗口里按 F12 开 DevTools；Ctrl+Shift+M 可换机型；关掉窗口即结束（配置目录是临时目录）。`);
console.log(`  调试端口 ${port}（remote-debugging-port），不影响你正在用的浏览器。`);
socket.close();
