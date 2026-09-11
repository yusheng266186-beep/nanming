// 纸感版是备用前端：脚本起不来时必须自己说出来，而不是留一个静态空壳让人以为数据是空的。
//
// 放在独立模块里而不是内联 <script>：内联脚本会经过 Vite 的 html-proxy 转换，与页面里的
// 模板/sprite 混在一起时容易互相干扰；独立模块的加载与报错都更可预测。
function panel() {
  let el = document.getElementById("boot-error");
  if (!el) {
    el = document.createElement("div");
    el.id = "boot-error";
    el.setAttribute("role", "alert");
    el.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7c2d12;"
      + "color:#fff;padding:12px 18px;font:12px/1.7 monospace;white-space:pre-wrap;"
      + "max-height:40vh;overflow:auto";
    document.body.appendChild(el);
  }
  return el;
}
function show(prefix, detail) {
  panel().textContent += prefix + detail + "\n";
}

window.addEventListener("error", (event) => {
  if (event && event.message) {
    show("启动失败：", event.message + (event.filename ? `  ${event.filename}:${event.lineno}` : ""));
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  show("未处理的 Promise 错误：", (reason && (reason.stack || reason.message)) || String(reason));
});

// 若主模块没能完成初始化，给出明确提示而不是空页面。
window.setTimeout(() => {
  if (!window.__paperBooted) {
    show("启动失败：", "主模块未执行完成（/src/app.js）。页面其余部分是静态内容，数字会是空的。");
  }
}, 4000);
