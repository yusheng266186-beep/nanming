// Pages 不能靠开发服务器挂载本地数据，也不能请求学生设备上的 localhost。
export function checkPagesConfig(env) {
  for (const key of ["VITE_NANHANG_RELEASE_BASE", "VITE_NANHANG_API_BASE"]) {
    let url;
    try { url = new URL(env[key]); } catch { throw new Error(`${key} 必须配置公网 HTTPS 地址`); }
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)) {
      throw new Error(`${key} 必须配置不带凭据的公网 HTTPS 地址`);
    }
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/check_pages_config.mjs")) {
  checkPagesConfig(process.env);
  console.log("Pages API 与数据地址配置通过");
}
