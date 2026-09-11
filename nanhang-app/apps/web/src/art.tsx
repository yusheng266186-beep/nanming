// 南溟 · 视觉资源
//
// 对应原始 南溟.html 中的 <svg class="sprite"> 图标定义与 4 张插画模板
// （art-sea / art-lighthouse / art-compass / art-harbor）以及「鲲」彩蛋。
// 原模板用 JS 克隆并给渐变 id 加前缀；React 中直接渲染同名 id 的 <defs>，
// 重复出现的实例其定义内容完全一致，浏览器取首个定义即可，视觉不变。

export function Icon({ name, size = "sm" }: { name: string; size?: "sm" | "lg" | "xl" }) {
  return <svg className={`icon ${size}`} aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

export function BrandMark({ className = "brand-mark" }: { className?: string }) {
  return <svg className={className} aria-hidden="true"><use href="#brand-mark" /></svg>;
}

export function Sprite() {
  return <svg className="sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h13m-6-6 6 6-6 6" /></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></symbol>
    <symbol id="i-sail" viewBox="0 0 24 24"><path d="M3 18h18M5 18l3-11 8 11M12 4v14M8 7l8 4" /></symbol>
    <symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></symbol>
    <symbol id="i-anchor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><path d="M12 7v14M8 11H5a7 7 0 0 0 14 0h-3M8 11h8" /></symbol>
    <symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" /><path d="M8 9h8M8 12.5h5" /></symbol>
    <symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5M3 17l9 5 9-5" opacity=".5" /></symbol>
    <symbol id="i-axis" viewBox="0 0 24 24"><path d="M3 12h18" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" /><path d="M12 5v14" opacity=".4" /></symbol>
    <symbol id="i-route" viewBox="0 0 24 24"><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h2" /></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></symbol>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M12 6C9 3.5 5 4 3.5 5v13C5 16 9 15.5 12 18c3-2.5 7-2 8.5 0V5C19 4 15 3.5 12 6Zm0 0v12" /></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></symbol>
    <symbol id="i-lighthouse" viewBox="0 0 24 24"><path d="M9 21h6M10 21 9 9h6l-1 12M9.5 9h5l-.5-4h-4zM7 6h2M15 6h2M6 12H4M20 12h-2" /></symbol>
    <symbol id="i-wave" viewBox="0 0 24 24"><path d="M2 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 15c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2" /></symbol>
    <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6" /></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z" /><path d="m9 12 2 2 4-4" /></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></symbol>
    <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v14m6-6-6 6-6-6" /></symbol>
    <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" /></symbol>
    <symbol id="i-fish" viewBox="0 0 24 24"><path d="M2 12c4-5 9-6 13-4 3 1.5 5 4 7 4-2 0-4 2.5-7 4-4 2-9 1-13-4Z" /><circle cx="7" cy="11" r=".8" fill="currentColor" stroke="none" /></symbol>
    <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.4 5.6L20 9.3l-4 4 1 6-5-2.8L7 19.3l1-6-4-4 5.6-.7z" /></symbol>
    {/* 南溟自己的图标：字形取自「鲲化而为鹏」与航海的器物，画法与上面保持一致
        （24×24、fill:none、stroke-width 1.5、圆头圆角）。 */}
    <symbol id="i-kun" viewBox="0 0 24 24">
      <path d="M2.5 13.5c3.2-5.4 8.6-7.4 12.8-5.2 2.5 1.3 4.1 3.1 6.2 3.1-1.6 1.6-3.2 3.2-5.8 4.2-4.6 1.8-9.8 1.1-13.2-2.1Z" />
      <path d="M5.4 8.2C6.6 6 8.8 5 10.6 5.2" />
      <circle cx="8.6" cy="12.4" r=".9" fill="currentColor" stroke="none" />
    </symbol>
    <symbol id="i-wing" viewBox="0 0 24 24">
      <path d="M4 17.5C10.5 16.4 15.6 12 17.6 5.6c1.1 5.4-1 11.3-6.2 13.4-3.1 1.2-6.2.5-7.4-1.5Z" />
      <path d="M6.8 19.6c1-3.1 3.1-5.2 5.2-6.3" />
    </symbol>
    <symbol id="i-log" viewBox="0 0 24 24">
      <path d="M5 4.6h8.6a3.4 3.4 0 0 1 3.4 3.4V20H8.4A3.4 3.4 0 0 1 5 16.6z" />
      <path d="M17 8h2v12h-2" />
      <path d="M8.4 9h5.4M8.4 12.4h5.4M8.4 15.8h3.4" />
    </symbol>
    <symbol id="i-ruler" viewBox="0 0 24 24">
      <path d="M3.4 15.2 15.2 3.4l5.4 5.4L8.8 20.6z" />
      <path d="m7.2 11.4 2.2 2.2M10.2 8.4l2.2 2.2M13.2 5.4l2.2 2.2" />
    </symbol>
    <symbol id="i-buoy" viewBox="0 0 24 24">
      <path d="M12 3v4.6" />
      <path d="M9 7.6h6l1.4 5.8h-8.8z" />
      <path d="M7.6 18.4c1.6 1.4 7.2 1.4 8.8 0" />
      <path d="M12 13.4v5" />
    </symbol>
    <symbol id="i-chartmap" viewBox="0 0 24 24">
      <rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2" />
      <path d="M3.6 9.6h16.8M9.2 4.6v14.8M14.8 4.6v14.8" opacity=".55" />
      <path d="M6.4 16.6c2.2-3.2 4.2-1.4 5.8-3.4 1.2-1.5 2.6-.6 4.4-2.6" strokeDasharray="2 2.4" />
    </symbol>
    <symbol id="brand-mark" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".35" />
      <circle cx="22" cy="22" r="14.5" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
      <path d="M22 4.5 24 20 22 22 20 20Z" fill="currentColor" opacity=".9" />
      <path d="M22 39.5 20 24 22 22 24 24Z" fill="currentColor" opacity=".45" />
      <path d="M4.5 22 20 20 22 22 20 24Z" fill="currentColor" opacity=".45" />
      <path d="M39.5 22 24 24 22 22 24 20Z" fill="currentColor" opacity=".9" />
      <path d="M22 15 28 27H16Z" fill="var(--brass)" opacity=".85" />
      <circle cx="22" cy="22" r="2.1" fill="var(--paper)" />
    </symbol>
    <symbol id="rose" viewBox="0 0 100 100">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="50" cy="50" r="46" opacity=".5" /><circle cx="50" cy="50" r="34" opacity=".35" /><circle cx="50" cy="50" r="6" />
        <path d="M50 4 56 44 50 50 44 44Z" fill="currentColor" opacity=".8" stroke="none" />
        <path d="M50 96 44 56 50 50 56 56Z" fill="currentColor" opacity=".4" stroke="none" />
        <path d="M4 50 44 44 50 50 44 56Z" fill="currentColor" opacity=".4" stroke="none" />
        <path d="M96 50 56 56 50 50 56 44Z" fill="currentColor" opacity=".8" stroke="none" />
        <path d="M18 18 46 42 50 50 42 46Z" opacity=".3" /><path d="M82 18 54 42 50 50 58 46Z" opacity=".3" />
        <path d="M18 82 46 58 50 50 42 54Z" opacity=".3" /><path d="M82 82 54 58 50 50 58 54Z" opacity=".3" />
      </g>
    </symbol>
  </defs></svg>;
}

export type ArtName = "sea" | "lighthouse" | "compass" | "harbor";

function SeaArt() {
  return <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="黎明时的海面与一条通向远方的航线">
    <defs>
      <linearGradient id="seaSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a2029" /><stop offset=".42" stopColor="#123c46" /><stop offset=".72" stopColor="#3d6a68" /><stop offset="1" stopColor="#c99a54" /></linearGradient>
      <linearGradient id="seaWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a5a5e" /><stop offset=".25" stopColor="#17414a" /><stop offset="1" stopColor="#071a21" /></linearGradient>
      <radialGradient id="seaSun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffe6b0" stopOpacity=".95" /><stop offset=".4" stopColor="#e8b96a" stopOpacity=".5" /><stop offset="1" stopColor="#e8b96a" stopOpacity="0" /></radialGradient>
      <radialGradient id="seaVin" cx=".5" cy=".45" r=".82"><stop offset="0" stopColor="#04121a" stopOpacity="0" /><stop offset="1" stopColor="#04121a" stopOpacity=".6" /></radialGradient>
      <linearGradient id="seaGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffdca0" stopOpacity="0" /><stop offset="1" stopColor="#ffdca0" stopOpacity=".55" /></linearGradient>
      <filter id="seaFog" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="24" /></filter>
      <filter id="seaSoft"><feGaussianBlur stdDeviation="3" /></filter>
      <filter id="seaBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="30" /></filter>
      <filter id="seaGrain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".05" /></feComponentTransfer></filter>
    </defs>
    <rect width="1200" height="540" fill="url(#seaSky)" />
    <g fill="#e9f0ea"><circle cx="150" cy="90" r="2.2" opacity=".9" /><circle cx="300" cy="60" r="1.5" opacity=".6" /><circle cx="470" cy="120" r="1.8" opacity=".7" /><circle cx="640" cy="70" r="1.4" opacity=".5" /><circle cx="820" cy="110" r="2" opacity=".75" /><circle cx="980" cy="66" r="1.5" opacity=".55" /><circle cx="1090" cy="140" r="1.7" opacity=".6" /><circle cx="230" cy="170" r="1.2" opacity=".4" /><circle cx="720" cy="180" r="1.3" opacity=".45" /></g>
    <circle cx="770" cy="520" r="180" fill="url(#seaSun)" />
    <circle cx="770" cy="524" r="42" fill="#f3d089" opacity=".9" filter="url(#seaSoft)" />
    <g opacity=".5" filter="url(#seaFog)" fill="#dfe6dd"><ellipse cx="300" cy="470" rx="320" ry="26" /><ellipse cx="900" cy="452" rx="360" ry="22" /><ellipse cx="600" cy="500" rx="420" ry="18" /></g>
    <rect y="538" width="1200" height="3" fill="#f0d9a8" opacity=".85" />
    <rect y="540" width="1200" height="360" fill="url(#seaWater)" />
    <rect x="640" y="540" width="260" height="360" fill="url(#seaGlow)" opacity=".5" filter="url(#seaBlur)" />
    <g stroke="#e7d3a6" fill="none" opacity=".3"><ellipse cx="770" cy="566" rx="150" ry="3" /><ellipse cx="770" cy="592" rx="110" ry="2.6" /><ellipse cx="770" cy="622" rx="180" ry="3" /><ellipse cx="770" cy="660" rx="130" ry="2.4" /><ellipse cx="770" cy="704" rx="210" ry="3.2" /><ellipse cx="770" cy="760" rx="160" ry="2.6" /></g>
    <g stroke="#bcd2cd" fill="none" opacity=".16"><path d="M0 600q60-8 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0" /><path d="M0 660q60-9 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0" /><path d="M0 730q60-10 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0" /><path d="M0 810q60-11 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0" /></g>
    <path d="M180 880C320 800 300 700 470 650S640 580 742 545" stroke="#e8d3a4" strokeWidth="2.4" strokeDasharray="4 12" fill="none" opacity=".8" strokeLinecap="round" />
    <g transform="translate(300,742)"><path d="M0 0h54l-8 16H8Z" fill="#0c2029" /><path d="M26 0V-46" stroke="#0c2029" strokeWidth="2.4" /><path d="M26-44 48-4H26Z" fill="#f0dcae" opacity=".92" /><path d="M24-40 6-4H24Z" fill="#cbb787" opacity=".8" /></g>
    <ellipse cx="327" cy="762" rx="46" ry="5" fill="#04141b" opacity=".3" filter="url(#seaSoft)" />
    <g transform="translate(1010,150) scale(1.5)" opacity=".14" stroke="#e8d3a4" fill="none" strokeWidth="1"><circle cx="50" cy="50" r="44" /><path d="M50 8 56 46 50 50 44 46Z" fill="#e8d3a4" stroke="none" /><path d="M92 50 54 56 50 50 54 44Z" fill="#e8d3a4" stroke="none" /><circle cx="50" cy="50" r="30" opacity=".6" /></g>
    <rect width="1200" height="900" fill="url(#seaVin)" />
    <rect width="1200" height="900" fill="#7d8a80" filter="url(#seaGrain)" />
  </svg>;
}

function LighthouseArt() {
  return <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="海岬上的灯塔">
    <defs><linearGradient id="lhSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#123c46" /><stop offset="1" stopColor="#4a7a72" /></linearGradient><linearGradient id="lhSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#255a5e" /><stop offset="1" stopColor="#0a2028" /></linearGradient><radialGradient id="lhBeam" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffe6b0" stopOpacity=".8" /><stop offset="1" stopColor="#ffe6b0" stopOpacity="0" /></radialGradient></defs>
    <rect width="900" height="330" fill="url(#lhSky)" />
    <g fill="#e9f0ea" opacity=".5"><circle cx="120" cy="60" r="1.6" /><circle cx="300" cy="40" r="1.2" /><circle cx="700" cy="70" r="1.5" /><circle cx="820" cy="40" r="1.2" /></g>
    <rect y="330" width="900" height="170" fill="url(#lhSea)" />
    <rect y="328" width="900" height="2.5" fill="#e8d3a4" opacity=".7" />
    <path d="M620 330 660 190h40l40 140Z" fill="#0c2029" />
    <path d="M668 210h24v120h-24Z" fill="#f0dcae" opacity=".85" />
    <circle cx="680" cy="188" r="26" fill="url(#lhBeam)" /><circle cx="680" cy="188" r="9" fill="#ffe6b0" />
    <path d="M680 188 380 120" stroke="#ffe6b0" strokeWidth="30" opacity=".1" strokeLinecap="round" />
    <g stroke="#bcd2cd" fill="none" opacity=".18"><path d="M0 380q50-7 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0" /><path d="M0 430q50-8 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0" /></g>
  </svg>;
}

function CompassArt() {
  return <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="海图与罗盘">
    <defs><linearGradient id="cpBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#123c46" /><stop offset="1" stopColor="#0a2028" /></linearGradient></defs>
    <rect width="900" height="500" fill="url(#cpBg)" />
    <g stroke="#e8d3a4" fill="none" opacity=".2"><path d="M0 100h900M0 200h900M0 300h900M0 400h900M150 0v500M300 0v500M450 0v500M600 0v500M750 0v500" strokeWidth=".6" /></g>
    <g transform="translate(450,250)" stroke="#e8d3a4" fill="none"><circle r="150" opacity=".3" /><circle r="110" opacity=".22" /><circle r="70" opacity=".4" /><path d="M0-150 22-24 0 0-22-24Z" fill="#e8d3a4" opacity=".55" stroke="none" /><path d="M0 150-22 24 0 0 22 24Z" fill="#e8d3a4" opacity=".3" stroke="none" /><path d="M150 0 24 22 0 0 24-22Z" fill="#e8d3a4" opacity=".3" stroke="none" /><path d="M-150 0-24-22 0 0-24 22Z" fill="#e8d3a4" opacity=".55" stroke="none" /></g>
    <path d="M60 440C200 400 260 300 420 300S640 200 840 120" stroke="#c89b52" strokeWidth="2.4" strokeDasharray="5 12" fill="none" opacity=".7" />
  </svg>;
}

function HarborArt() {
  return <svg viewBox="0 0 900 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="清晨的港湾">
    <defs><linearGradient id="hbSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe6dd" /><stop offset="1" stopColor="#c6d2c8" /></linearGradient><linearGradient id="hbSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d9a96" /><stop offset="1" stopColor="#3f6165" /></linearGradient></defs>
    <rect width="900" height="300" fill="url(#hbSky)" />
    <rect y="300" width="900" height="200" fill="url(#hbSea)" />
    <rect y="298" width="900" height="2" fill="#a97b34" opacity=".5" />
    <g fill="#2c444c" opacity=".85"><path d="M80 300V200h30v100Z" /><path d="M60 210h70l-14-24H74Z" /><path d="M700 300V180h26v120Z" /><path d="M682 190h62l-12-22h-38Z" /></g>
    <g stroke="#e9f0ea" fill="none" opacity=".2"><path d="M0 360q50-6 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0" /><path d="M0 420q50-7 100 0t100 0 100 0 100 0 100 0 100 0 100 0 100 0 100 0" /></g>
    <g transform="translate(420,300)"><path d="M0 0h64l-10 18H10Z" fill="#1c3d40" /><path d="M30 0V-40" stroke="#1c3d40" strokeWidth="2" /><path d="M30-38 50-4H30Z" fill="#a97b34" opacity=".8" /></g>
  </svg>;
}

export function Art({ name }: { name: ArtName }) {
  if (name === "sea") return <SeaArt />;
  if (name === "lighthouse") return <LighthouseArt />;
  if (name === "compass") return <CompassArt />;
  return <HarborArt />;
}

export function ArtSlot({ name, className = "slot" }: { name: ArtName; className?: string }) {
  return <div className={className} aria-hidden="true"><Art name={name} /></div>;
}

export function KunArt() {
  return <svg className="kun" viewBox="0 0 320 200" fill="none" aria-hidden="true">
    <path d="M20 150c40-8 70-40 96-72 14-17 30-30 52-30 26 0 40 18 40 38 0 14-8 24-18 24-8 0-14-6-14-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M96 150c30 6 62 4 92-8 22-9 40-24 54-42" stroke="currentColor" strokeWidth="1.4" opacity=".6" strokeLinecap="round" />
    <path d="M208 48c22-6 46-4 66 6-18 2-30 10-40 22-8-12-16-22-26-28Z" fill="currentColor" opacity=".85" />
    <path d="M232 40c18-14 40-20 62-18-16 8-28 18-36 32-10-6-18-10-26-14Z" fill="currentColor" opacity=".55" />
    <circle cx="252" cy="52" r="2.4" fill="var(--paper)" />
    <path d="M14 168h292" stroke="currentColor" strokeWidth="1" opacity=".3" />
    <path d="M30 176c20-4 40-4 60 0M120 176c20-4 40-4 60 0M210 176c20-4 40-4 60 0" stroke="currentColor" strokeWidth="1" opacity=".25" />
  </svg>;
}
