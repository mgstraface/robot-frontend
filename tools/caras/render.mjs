// Genera las caras del robot a partir de las del panel: le saca una "foto" a cada cuadro de cada
// cara y animación (con el mismo componente Face.jsx) y las guarda comprimidas en un archivo
// que el firmware reproduce tal cual. Así la placa se ve idéntica al panel.
//
// Uso:  node tools/caras/render.mjs ../robot-backend/firmware/data/caras.bin
// Necesita esbuild, playwright y sharp (variable NODE_TOOLS = carpeta node_modules donde están).
//
// Formato del archivo (little-endian):
//   "CARA" u8 versión | u16 nColores, u16 colores RGB565 | u16 nClips
//   por clip: u8 largo, nombre, u16 msPorCuadro, u16 nCuadros, u8 loop, u32 offset
//   cada cuadro: solo las filas que cambiaron respecto del cuadro anterior, en orden, y 0xFF al final:
//     u8 y, u8 0, u16 x0, u16 n, corridas (u8 código, u8 largo) que cubren n píxeles desde x0
//     u8 y, u8 1  -> la fila y es igual a la fila y-1 (del cuadro nuevo)
//   códigos 0..7: color de ojos en 8 intensidades (0 = fondo negro) · 16..255: colores fijos (paleta)
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tools = process.env.NODE_TOOLS || '/opt/npm-tools/node_modules';
const require = createRequire(path.join(tools, 'x.js'));
const { chromium } = require('playwright');
const sharp = require('sharp');

const OUT = path.resolve(process.argv[2] || path.join(here, 'caras.bin'));
const W = 320;
const H = 172;
const FPS_MS = 66; // 15 cuadros por segundo
const LOOP_MAX = 9300; // si las animaciones no se repiten antes, se corta acá
const MISMO_EN_LOS_DOS = ['gol', 'bandera']; // no cambian con el estilo: se guardan una vez (tierno)
const CLIMAS = ['despejado', 'parcial', 'nublado', 'niebla', 'lluvia', 'tormenta', 'nieve'];
const SOLO = process.env.SOLO ? new RegExp(process.env.SOLO) : null; // para probar: SOLO="feliz"

// ---------- página
const build = path.join(here, '.build');
fs.mkdirSync(build, { recursive: true });
execFileSync(path.join(tools, '.bin/esbuild'), [
  path.join(here, 'entry.jsx'),
  '--bundle',
  `--outfile=${path.join(build, 'entry.js')}`,
  '--loader:.js=jsx',
  '--jsx=automatic',
  '--log-level=warning',
  `--define:import.meta.env.VITE_API_URL=""`,
], { stdio: 'inherit', env: { ...process.env, NODE_PATH: tools } });
fs.copyFileSync(path.join(here, 'SpaceGrotesk.ttf'), path.join(build, 'SpaceGrotesk.ttf'));
fs.writeFileSync(
  path.join(build, 'index.html'),
  `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="entry.css"><style>
  @font-face { font-family: 'Space Grotesk'; src: url(SpaceGrotesk.ttf); font-weight: 300 700; }
  html, body { margin: 0; background: #000; }
  :root { --screen: #000 !important; }
  .face { filter: none !important; }
  .face-enter, .face-leave { animation: none !important; opacity: 1 !important; transform: none !important; }
  #app { width: 320px; }
  </style></head><body><div id="app"></div><script src="entry.js"></script></body></html>`
);

// ---------- captura
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[página]', e.message));
await page.goto('file://' + path.join(build, 'index.html'));
await page.evaluate(() => document.fonts.ready);
const listas = await page.evaluate(() => window.LISTAS);

const clips = [];
for (const st of ['tierno', 'terror']) {
  for (const emo of listas.emociones) clips.push({ name: `e/${st}/${emo}`, props: { emotion: emo, faceStyle: st }, ms: 0, loop: true });
  // boca hablando: la placa la pega encima de la cara mientras suena la voz
  clips.push({ name: `boca/${st}`, props: { emotion: 'neutral', faceStyle: st, talking: true }, ms: 0, loop: true });
  for (const a of listas.acciones) {
    if (a.name === 'dormir' || !Number.isFinite(a.ms)) continue;
    if (a.modes && !a.modes.includes(st)) continue;
    if (st === 'terror' && MISMO_EN_LOS_DOS.includes(a.name)) continue;
    if (a.name === 'clima') {
      for (const k of CLIMAS) clips.push({ name: `a/${st}/clima:${k}`, props: { action: `clima:${k}`, faceStyle: st }, ms: a.ms, loop: false });
    } else clips.push({ name: `a/${st}/${a.name}`, props: { action: a.name, faceStyle: st }, ms: a.ms, loop: false });
  }
}
const todo = SOLO ? clips.filter((c) => SOLO.test(c.name)) : clips;

// token por píxel: color de ojos (0x10000 | intensidad) o color fijo (RGB565)
function tokens(raw) {
  const t = new Uint32Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 3) {
    const r = raw[p], g = raw[p + 1], b = raw[p + 2];
    if (r <= 12 && b <= 12) t[i] = 0x10000 | Math.round((g * 7) / 255);
    else t[i] = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
  }
  return t;
}

const hist = new Map(); // color fijo -> cantidad de píxeles
const svg = page.locator('svg.face');
let total = 0;
for (const [n, clip] of todo.entries()) {
  await page.evaluate((p) => window.mostrar(p), clip.props);
  // cuánto dura el ciclo: el largo (entre 1,5 y 9,3 s) en el que todas las animaciones que se repiten
  // vuelven casi justo al principio (así el salto al repetir no se nota y no se graba de más)
  const periodos = await page.evaluate(() =>
    document.getAnimations()
      .map((a) => a.effect.getComputedTiming())
      .filter((t) => t.iterations === Infinity && t.duration > 0)
      .map((t) => t.duration)
  );
  let ciclo = 0;
  if (periodos.length) {
    let best = Infinity;
    for (let L = 1500; L <= LOOP_MAX; L += FPS_MS) {
      const err = periodos.reduce((e, p) => { const r = L % p; return e + Math.min(r, p - r) / p; }, 0);
      const score = err + L / LOOP_MAX / 20; // a igual error, mejor más corto
      if (score < best) { best = score; ciclo = L; }
    }
  }
  const ms = clip.loop ? ciclo : clip.ms;
  const nFrames = ms ? Math.max(1, Math.round(ms / FPS_MS)) : 1;
  const frames = [];
  let prev = null;
  for (let f = 0; f < nFrames; f++) {
    await page.evaluate((t) => window.enInstante(t), f * FPS_MS);
    const png = await svg.screenshot({ type: 'png' });
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== W || info.height !== H) throw new Error(`${clip.name}: tamaño ${info.width}x${info.height}`);
    const t = tokens(data);
    const rows = [];
    for (let y = 0; y < H; y++) {
      const o = y * W;
      // tramo que cambió respecto del cuadro anterior
      let x0 = 0, x1 = W - 1;
      if (prev) {
        while (x0 < W && t[o + x0] === prev[o + x0]) x0++;
        if (x0 === W) continue; // fila igual
        while (t[o + x1] === prev[o + x1]) x1--;
      }
      // igual a la fila de arriba (ya actualizada): se copia
      if (y > 0) {
        let same = true;
        for (let x = 0; x < W; x++) if (t[o + x] !== t[o - W + x]) { same = false; break; }
        if (same) { rows.push([y, null]); continue; }
      }
      const runs = [];
      for (let x = x0; x <= x1; ) {
        const v = t[o + x];
        let len = 1;
        while (x + len <= x1 && t[o + x + len] === v) len++;
        runs.push([v, len]);
        if (!(v & 0x10000)) hist.set(v, (hist.get(v) || 0) + len);
        x += len;
      }
      rows.push([y, runs, x0, x1 - x0 + 1]);
    }
    frames.push(rows);
    prev = t;
  }
  clip.frames = frames;
  total += nFrames;
  process.stdout.write(`\r${n + 1}/${todo.length} ${clip.name.padEnd(28)} ${nFrames} cuadros`);
}
await browser.close();
console.log(`\n${total} cuadros en total`);

// ---------- paleta: los 240 colores fijos más usados; el resto va al más parecido
const rgb = (c) => [((c >> 11) & 31) << 3, ((c >> 5) & 63) << 2, (c & 31) << 3];
const palette = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 240).map(([c]) => c);
const near = new Map();
function code(v) {
  if (v & 0x10000) return v & 7;
  if (near.has(v)) return near.get(v);
  const [r, g, b] = rgb(v);
  let best = 0, bd = Infinity;
  palette.forEach((p, i) => {
    const [pr, pg, pb] = rgb(p);
    const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  near.set(v, 16 + best);
  return 16 + best;
}

// ---------- archivo
const parts = [];
const u8 = (v) => parts.push(Buffer.from([v & 255]));
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16LE(v); parts.push(b); };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); parts.push(b); };

const datos = todo.map((clip) => {
  const out = [];
  for (const rows of clip.frames) {
    for (const [y, runs, x0, n] of rows) {
      out.push(y);
      if (!runs) { out.push(1); continue; }
      out.push(0, x0 & 255, x0 >> 8, n & 255, n >> 8);
      // junta corridas que quedaron con el mismo código y parte las de más de 255
      const merged = [];
      for (const [v, len] of runs) {
        const c = code(v);
        if (merged.length && merged[merged.length - 1][0] === c) merged[merged.length - 1][1] += len;
        else merged.push([c, len]);
      }
      for (let [c, len] of merged) {
        while (len > 0) {
          const l = Math.min(255, len);
          out.push(c, l);
          len -= l;
        }
      }
    }
    out.push(0xff);
  }
  return Buffer.from(out);
});

parts.push(Buffer.from('CARA'));
u8(2);
u16(palette.length);
palette.forEach(u16);
u16(todo.length);
let headerSize = 4 + 1 + 2 + palette.length * 2 + 2;
for (const c of todo) headerSize += 1 + Buffer.byteLength(c.name) + 2 + 2 + 1 + 4;
let offset = headerSize;
todo.forEach((c, i) => {
  u8(Buffer.byteLength(c.name));
  parts.push(Buffer.from(c.name));
  u16(FPS_MS);
  u16(c.frames.length);
  u8(c.loop ? 1 : 0);
  u32(offset);
  offset += datos[i].length;
});
datos.forEach((d) => parts.push(d));
const file = Buffer.concat(parts);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, file);
console.log(`${OUT}: ${(file.length / 1024).toFixed(0)} KB, ${todo.length} clips, ${palette.length} colores fijos`);
