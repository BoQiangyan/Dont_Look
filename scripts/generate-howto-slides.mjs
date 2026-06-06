import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const outDir = "assets/ui/howto-generated";

const assets = {
  stage: "assets/stages/training-yard-stage-landscape.png",
  zhangIdle: "assets/characters/zhang-idle.png",
  zhangPunch: "assets/characters/zhang-punch.png",
  zhangDouble: "assets/characters/zhang-doublePunch.png",
  zhangLook: "assets/characters/zhang-lookBack.png",
  zhangMachine: "assets/characters/zhang-throwMachine.png",
  michelIdle: "assets/characters/michel-idle.png",
  michelHit: "assets/characters/michel-hit.png",
  michelLook: "assets/characters/michel-lookBack.png",
  michelDodge: "assets/characters/michel-dodge.png",
};

function dataUri(path) {
  const ext = extname(path).slice(1);
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

const img = Object.fromEntries(Object.entries(assets).map(([key, path]) => [key, dataUri(path)]));

function frame(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1672 941" role="img">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="8" flood-color="#000" flood-opacity=".65"/>
    </filter>
  </defs>
  <image href="${img.stage}" width="1672" height="941" preserveAspectRatio="xMidYMid slice" style="image-rendering:pixelated"/>
  <rect width="1672" height="941" fill="#080a0d" opacity=".32"/>
  <rect x="24" y="24" width="1624" height="893" rx="18" fill="none" stroke="#0b0c0e" stroke-width="28"/>
  <rect x="42" y="42" width="1588" height="857" rx="12" fill="none" stroke="#d6a84e" stroke-width="10"/>
  <rect x="66" y="66" width="1540" height="809" rx="8" fill="none" stroke="#252b31" stroke-width="10"/>
  ${content}
</svg>`;
}

function character(href, x, y, w, flip = false, opacity = 1) {
  const transform = flip ? ` transform="translate(${x + w} ${y}) scale(-1 1)"` : ` x="${x}" y="${y}"`;
  return `<image href="${href}"${transform} width="${w}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated" filter="url(#shadow)"/>`;
}

function arrow(x1, y1, x2, y2, color) {
  const head = x2 > x1 ? `${x2 - 44},${y2 - 34} ${x2},${y2} ${x2 - 44},${y2 + 34}` : `${x2 + 44},${y2 - 34} ${x2},${y2} ${x2 + 44},${y2 + 34}`;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="22" stroke-linecap="round"/>
  <polygon points="${head}" fill="${color}"/>`;
}

function pipRow(x, y, count = 3) {
  return Array.from({ length: count }, (_, i) =>
    `<circle cx="${x + i * 74}" cy="${y}" r="30" fill="#f0b54c" stroke="#fff0ad" stroke-width="6" filter="url(#glow)"/>`,
  ).join("");
}

function impact(cx, cy, scale = 1) {
  const pts = [
    [0, -70], [18, -22], [70, -42], [34, -6], [78, 26], [24, 20],
    [34, 72], [0, 34], [-36, 72], [-24, 20], [-78, 26], [-34, -6],
    [-70, -42], [-18, -22],
  ].map(([x, y]) => `${cx + x * scale},${cy + y * scale}`).join(" ");
  return `<polygon points="${pts}" fill="#f35b4f" stroke="#ffe08a" stroke-width="${6 * scale}"/>`;
}

function ironBlock(x, y) {
  return `<g transform="translate(${x} ${y}) rotate(-14)" filter="url(#shadow)">
    <rect x="0" y="0" width="120" height="82" rx="8" fill="#6e7377" stroke="#181a1d" stroke-width="8"/>
    <path d="M16 18h88M18 44h84M20 68h80" stroke="#3f4549" stroke-width="6"/>
  </g>`;
}

const slides = [
  {
    file: "howto-page-01-turns.svg",
    svg: frame(`
      <ellipse cx="420" cy="742" rx="240" ry="46" fill="#f0b54c" opacity=".26"/>
      <ellipse cx="1242" cy="742" rx="240" ry="46" fill="#67a9ff" opacity=".22"/>
      ${character(img.zhangIdle, 210, 275, 390)}
      ${character(img.michelIdle, 1062, 275, 390)}
      ${arrow(680, 452, 992, 452, "#f0b54c")}
      ${arrow(992, 548, 680, 548, "#67a9ff")}
      <rect x="342" y="820" width="160" height="34" rx="8" fill="#f35b4f"/>
      <rect x="1172" y="820" width="160" height="34" rx="8" fill="#67a9ff"/>
    `),
  },
  {
    file: "howto-page-02-defense-choice.svg",
    svg: frame(`
      <line x1="836" y1="102" x2="836" y2="838" stroke="#d6a84e" stroke-width="8"/>
      <ellipse cx="416" cy="746" rx="210" ry="42" fill="#f0b54c" opacity=".22"/>
      <ellipse cx="1256" cy="746" rx="210" ry="42" fill="#f0b54c" opacity=".22"/>
      ${character(img.zhangIdle, 210, 315, 390)}
      ${character(img.zhangLook, 1056, 315, 390)}
      ${ironBlock(1338, 222)}
      ${arrow(1400, 268, 1300, 332, "#f35b4f")}
      <path d="M1110 250c-70 74-54 154 4 218" fill="none" stroke="#f7f1df" stroke-width="12" stroke-linecap="round" opacity=".9"/>
      <circle cx="418" cy="150" r="42" fill="#67a9ff" opacity=".88"/>
      <circle cx="1256" cy="150" r="42" fill="#f35b4f" opacity=".88"/>
    `),
  },
  {
    file: "howto-page-03-attack-counters.svg",
    svg: frame(`
      <line x1="836" y1="102" x2="836" y2="838" stroke="#d6a84e" stroke-width="8"/>
      ${character(img.zhangPunch, 105, 338, 430)}
      ${character(img.michelLook, 478, 330, 340)}
      ${impact(548, 454, 1.08)}
      ${character(img.zhangMachine, 905, 338, 390)}
      ${character(img.michelIdle, 1240, 332, 340)}
      ${ironBlock(1268, 408)}
      ${impact(1335, 478, .9)}
      ${arrow(1048, 444, 1250, 444, "#f0b54c")}
    `),
  },
  {
    file: "howto-page-04-surprise-resource.svg",
    svg: frame(`
      <ellipse cx="400" cy="744" rx="220" ry="42" fill="#f0b54c" opacity=".24"/>
      <ellipse cx="812" cy="744" rx="180" ry="34" fill="#f35b4f" opacity=".16"/>
      <ellipse cx="1260" cy="744" rx="220" ry="42" fill="#67a9ff" opacity=".2"/>
      ${character(img.zhangIdle, 196, 330, 392)}
      ${character(img.michelLook, 640, 330, 348)}
      ${pipRow(1040, 360)}
      ${character(img.zhangDouble, 1190, 318, 370, false, .62)}
      ${arrow(560, 555, 710, 555, "#f0b54c")}
      ${arrow(990, 430, 1140, 430, "#f0b54c")}
    `),
  },
  {
    file: "howto-page-05-win-strategy.svg",
    svg: frame(`
      <rect x="170" y="116" width="360" height="38" rx="10" fill="#f35b4f"/>
      <rect x="170" y="116" width="108" height="38" rx="10" fill="#3a2224"/>
      <rect x="1136" y="116" width="360" height="38" rx="10" fill="#67a9ff"/>
      ${pipRow(718, 182)}
      ${character(img.zhangDouble, 180, 310, 430)}
      ${character(img.michelHit, 1080, 330, 390)}
      ${impact(1045, 470, 1.18)}
      ${arrow(615, 470, 985, 470, "#f0b54c")}
      <circle cx="350" cy="820" r="30" fill="#f35b4f"/>
      <circle cx="418" cy="820" r="30" fill="#f35b4f"/>
      <circle cx="486" cy="820" r="30" fill="#252b31"/>
      <circle cx="1200" cy="820" r="30" fill="#67a9ff"/>
      <circle cx="1268" cy="820" r="30" fill="#252b31"/>
      <circle cx="1336" cy="820" r="30" fill="#252b31"/>
    `),
  },
];

mkdirSync(outDir, { recursive: true });

for (const slide of slides) {
  writeFileSync(join(outDir, slide.file), slide.svg);
  console.log(`Wrote ${join(outDir, slide.file)}`);
}
