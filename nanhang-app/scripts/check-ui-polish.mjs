// DOM/逻辑回归：仅合成夹具，不截图、不作视觉验收、不请求学校或 AI 服务。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
const app = resolve(fileURLToPath(new URL("..", import.meta.url)));
const web = join(app, "apps/web");
const name = `.ui-polish-${process.pid}`;
const fixture = join(web, `${name}.tsx`);
const page = join(web, `${name}.html`);
const profile = await mkdtemp(join(tmpdir(), "nanming-ui-dom-"));
const delay = ms => new Promise(r => setTimeout(r, ms));
let server, browser, socket;
const report = { scope: "synthetic DOM assertions only; no visual acceptance", checks: [] };
try {
  await writeFile(fixture, `
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Disclosure } from "./src/disclosure";
import { useReducedMotion } from "./src/motion";
import { renderSail } from "./src/chapters/sail";
import { renderSettings } from "./src/chapters/settings";
import { initialQualityState, useDeckStack } from "./src/chapters/shared";
import { initialState } from "./src/model";
import { initialAiPanel } from "./src/ai-panel";
import "./src/style.css";
function Fixture() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [off, setOff] = useState(false);
  const [whisper, setWhisper] = useState(true);
  const [state, setState] = useState(initialState);
  const [ai, setAi] = useState(initialAiPanel);
  const calm = useReducedMotion();
  const root = useRef(null);
  useDeckStack(root, String(open));
  useEffect(() => { document.documentElement.dataset.motion = off ? "off" : "on"; }, [off]);
  const sail = renderSail({state,setState,page:"sail",setPage:()=>{},quality:initialQualityState,setShowKun:()=>{},setToast:()=>{},toast:null,route:"manual",chooseRoute:()=>{}});
  const setting = renderSettings({open:settings,onClose:()=>setSettings(false),ai,setAi,clear:()=>{},route:"manual",releaseId:"SYNTHETIC-VERY-LONG-RELEASE-IDENTIFIER-2026-0123456789",whisperOn:whisper,setWhisperOn:setWhisper,motionOff:off,setMotionOff:setOff});
  return <><output id="calm">{String(calm)}</output><button id="settings" onClick={()=>setSettings(true)}>设置夹具</button><main style={{maxWidth:1200,margin:"auto",padding:16}}>{sail}
    <section id="page-chart" ref={root}><div className="deck"><div className={"stop"+(open?" open":"")}>
      <button id="toggle" className="stop-head" aria-expanded={open} aria-controls="test-body" onClick={()=>setOpen(!open)}>合成抽屉</button>
      <Disclosure id="test-body" open={open}><div className="schools card-stack">{[0,1,2].map(i=><div key={i} className="stack-slot" style={{"--i":i}}><article className="scard" style={{height:240}}><button>合成卡片 {i}</button></article></div>)}<div className="stack-tail"/></div></Disclosure>
    </div></div></section><div style={{height:800}}/></main>{setting}</>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
`);
  await writeFile(page, `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/${name}.tsx"></script></body></html>`);
  server = await createServer({ root:web, configFile:join(web,"vite.config.ts"), server:{host:"127.0.0.1",port:5187,strictPort:true}, logLevel:"error" });
  await server.listen();
  const executable = process.env.NANHANG_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  browser = spawn(executable,["--headless=new","--disable-gpu","--no-first-run","--remote-debugging-port=0",`--user-data-dir=${profile}`,"about:blank"],{windowsHide:true,stdio:"ignore"});
  browser.on("error", err => console.error(err.message));
  let targets;
  for(let i=0;i<80;i++){try{
    const port=(await readFile(join(profile,"DevToolsActivePort"),"utf8")).split(/\r?\n/)[0];
    targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();break;
  }catch{await delay(100);}}
  assert(targets?.length, "headless browser started");
  socket = new WebSocket(targets.find(t=>t.type==="page").webSocketDebuggerUrl);
  await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
  let seq=0; const pending=new Map(); const runtimeErrors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==="Runtime.exceptionThrown")runtimeErrors.push(m.params.exceptionDetails.text);};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  const check=async (label,expression)=>{assert(await evaluate(expression),label);report.checks.push(label);};
  const viewport=async(width,height)=>call("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:false});
  await call("Runtime.enable");
  await viewport(390,844);
  await call("Page.navigate",{url:`http://127.0.0.1:5187/${name}.html`});
  for(let i=0;i<100;i++){if(await evaluate('!!document.getElementById("toggle")'))break;await delay(100);}
  await delay(650);
  await check("初始关闭不挂载卡片",'document.querySelector("#test-body").clientHeight===0 && !document.querySelector("#test-body .scard")');
  await evaluate('document.querySelector("#toggle").scrollIntoView({behavior:"instant",block:"start"});window.beforeY=scrollY;document.querySelector("#toggle").click()');
  await delay(100);
  const opening=await evaluate('document.querySelector("#test-body").getBoundingClientRect().height');
  await delay(520);
  const expanded=await evaluate('document.querySelector("#test-body").getBoundingClientRect().height');
  assert(opening>0 && opening<expanded,`opening interpolates: ${opening}/${expanded}`);
  report.checks.push("打开高度存在中间帧");
  await check("开合不触发滚动锚定跳动",'Math.abs(scrollY-window.beforeY)<1');
  await evaluate('document.querySelector("#toggle").click()');
  await delay(100);
  const closing=await evaluate('document.querySelector("#test-body").getBoundingClientRect().height');
  assert(closing>0 && closing<expanded,`closing interpolates: ${closing}/${expanded}`);
  await check("关闭过程中正文保留且不可聚焦",'document.querySelectorAll("#test-body .scard").length===3 && document.querySelector("#test-body").inert');
  await evaluate('document.querySelector("#toggle").click()');
  await delay(580);
  await check("快速反向打开恢复完整高度",`Math.abs(document.querySelector("#test-body").getBoundingClientRect().height-${expanded})<1`);
  await evaluate('window.scrollTo({top:document.querySelector("#test-body .stack-slot").getBoundingClientRect().top+scrollY+80,behavior:"instant"})');
  await delay(450);
  await check("裁切容器保留卡片相对视口吸附",'(()=>{const s=document.querySelector("#test-body .stack-slot");return Math.abs(s.getBoundingClientRect().top-parseFloat(getComputedStyle(s).top))<1})()');
  await evaluate('document.querySelector("#settings").click()');
  await delay(100);
  await evaluate(`document.querySelector('[aria-label="界面动效"] button:last-of-type').click()`);
  await delay(80);
  await check("设置关闭动效实时更新 JS 偏好",'document.documentElement.dataset.motion==="off" && document.querySelector("#calm").textContent==="true"');
  await check("关闭动效卡片回到静止姿态",'getComputedStyle(document.querySelector("#test-body .scard")).transform==="none"');
  await evaluate(`document.querySelector('[aria-label="界面动效"] button:first-of-type').click()`);
  await call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  await delay(80);
  await check("系统减少动态效果实时优先",'document.querySelector("#calm").textContent==="true"');
  for(const width of [320,390,768,1280]) {
    await viewport(width,844);await delay(80);
    await check(`${width}px 设置内容没有水平溢出`,'(()=>{const s=document.querySelector(".settings-card");return s.scrollWidth<=s.clientWidth+1 && s.getBoundingClientRect().left>=0 && s.getBoundingClientRect().right<=innerWidth+1})()');
    await check(`${width}px 开关触控高度至少40px`,'[...document.querySelectorAll(".settings-card .set-row button")].every(b=>b.getBoundingClientRect().height>=40)');
  }
  await evaluate(`document.querySelector('[aria-label="关闭设置"]').click()`);
  for(const width of [320,390,768,1280]){
    await viewport(width,844);await delay(100);
    await check(`${width}px 起航内容没有水平溢出`,'document.documentElement.scrollWidth<=innerWidth+1');
  }
  await check("桌面行装三项并列",'(()=>{const r=[...document.querySelectorAll(".pack-row")];return Math.abs(r[0].getBoundingClientRect().top-r[2].getBoundingClientRect().top)<1})()');
  assert.equal(runtimeErrors.length,0,JSON.stringify(runtimeErrors));
  report.checks.push("无未捕获运行时异常");
  report.result="passed";
  report.count=report.checks.length;
  const output=process.argv[2];
  if(output)await writeFile(resolve(output),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
  await call("Browser.close").catch(()=>{});
} finally {
  socket?.close();browser?.kill();await server?.close();
  await Promise.all([fixture,page].map(p=>unlink(p).catch(()=>{})));
  // 保留系统临时目录中的无账号测试配置，避免误删正在退出的浏览器文件。
}
