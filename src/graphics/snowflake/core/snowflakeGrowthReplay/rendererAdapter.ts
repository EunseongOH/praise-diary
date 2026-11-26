/**
 * Gate 3E — R-B "isolated replay renderer" (dev-only). Why not R-A (inject a visibility adapter into the Gate 2I
 * RefineCanvas): RefineCanvas takes one IState and draws every active glyph; its pose / light come from module functions
 * (poseI / lightI), there is no per-glyph alpha or visibility hook, and changing the `is` prop re-runs its whole effect
 * (new bitmap cache, ~2 full builds). Injecting one would need an edit of the 2I file → not allowed.
 * So this file draws ONE canvas with the Gate 2I `optimized` call path op for op (copied; 2I is untouched):
 *   same glyph bitmaps (cold ramp, back blur, front glow tiers), same light keys (lightI), same alpha-box trims (+3 px),
 *   statics pre-drawn into the same 5 z-band canvases (shared box, own content box copied at integer offsets), moving
 *   glyphs inserted by their current z, pulses (source-atop) and H3 lights (lighter).
 * The only addition is one alpha factor per draw (and per light). A draw goes into a band only when its glyph is static
 * AND fully visible, so a frame where every factor is 0 or 1 is the Gate 2I frame of that snapshot op for op
 * (the browser tests compare bytes). Only Gate 2I I3 looks are supported (cold light, no halo eraser) — asserted.
 */
import { FONT, VIEW } from '../fullSnowflake/engine';
import { CAMERA } from '../multiHelix/engine';
import { MOTION } from '../layeredCrystal/engine';
import { particleAlpha, pulsesAt, rampColor, type Pulse } from '../frostedLighting/engine';
import { lightI, newPose, poseI, type IState, type Light, type Pose } from '../h3Refinement/engine';

const HEADROOM = 1.15; // = Gate 2I
const ZB = [-2, 1, 2.5, 4, Infinity];
const bandOf = (z: number) => { let b = 0; while (z >= ZB[b]!) b++; return b; };
type Trim = { x: number; y: number; w: number; h: number };
/** = Gate 2I trimOf: alpha bounding box + 3 px transparent margin */
function trimOf(c: HTMLCanvasElement): Trim {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
  x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(c.width - 1, x1 + 3); y1 = Math.min(c.height - 1, y1 + 3);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** one draw: active glyph i of state `is` with an alpha factor; `order` = its rank in the frame (ties of z resolve by it) */
export type RDraw = { is: IState; i: number; alpha: number };
export type RLight = { is: IState; i: number; alpha: number };
export type RStats = { frames: number; draws: number; lightDraws: number; bitmapBuilds: number; bandBuilds: number; px: number; jsMs: number; lastMs: number; maxMs: number; lastDraws: number };
export const newRStats = (): RStats => ({ frames: 0, draws: 0, lightDraws: 0, bitmapBuilds: 0, bandBuilds: 0, px: 0, jsMs: 0, lastMs: 0, maxMs: 0, lastDraws: 0 });

export function createReplayRenderer(canvas: HTMLCanvasElement, look: IState, stats: RStats = newRStats()) {
  const ctx = canvas.getContext('2d')!;
  const family = getComputedStyle(canvas).getPropertyValue('--font-body').trim() || 'sans-serif';
  const { theme } = look;
  if (look.look.light !== 'cold' || look.look.halo.cut > 0) throw new Error('replay renderer: only the Gate 2I I3 look (cold light, no halo) is supported');
  const LV = theme.lighting.levels;
  let cssWidth = canvas.clientWidth || VIEW.width;
  let scale = 0, vs = 1, vx = 0, vy = 0, det = 1;
  let cache = new Map<string, HTMLCanvasElement[]>();
  let sprites = new Map<string, HTMLCanvasElement>();
  const trims = new WeakMap<HTMLCanvasElement, Trim>();
  const poses: Pose[] = [], lights: Light[] = [];
  let order = new Int32Array(64);
  const pulses: Pulse[] = [];
  type Band = { ink: HTMLCanvasElement; count: number; x: number; y: number; sub: Trim };
  let bands: Band[] = [];
  let bandSig = '';
  const bandIds = new Map<IState, number>();
  let zoom = 1, fx = 0, fy = 0;

  const bitmap = (glyph: string, key: number) => {
    let b = cache.get(glyph);
    if (!b) { b = []; cache.set(glyph, b); }
    if (!b[key]) {
      const size = Math.ceil(FONT * 2 * scale);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d')!;
      g.font = `480 ${FONT * scale}px ${family}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = rampColor(theme, Math.floor(key / 3) / (LV - 1));
      const L = Math.floor(key / 3) / (LV - 1), tier = key % 3, G = theme.lighting.frontGlow;
      if (L <= theme.lighting.backSoft.to) g.filter = `blur(${theme.lighting.backSoft.blur * scale}px)`;
      if (tier) { g.shadowColor = tier === 2 ? G.flashColor : G.color; g.shadowBlur = (tier === 2 ? G.flashBlur : G.blur) * scale; }
      g.fillText(glyph, size / 2, size / 2);
      if (tier === 2) g.fillText(glyph, size / 2, size / 2);
      b[key] = c;
      stats.bitmapBuilds++;
    }
    return b[key]!;
  };
  const keyOf = (is: IState, i: number, f: Pose, t: number, l: Light) => {
    lightI(is, i, t, f, l);
    return Math.round(Math.max(0, Math.min(1, l.L)) * (LV - 1)) * 3 + l.tier;
  };
  const blit = (c: CanvasRenderingContext2D, img: HTMLCanvasElement) => {
    let tr = trims.get(img);
    if (!tr) { tr = trimOf(img); trims.set(img, tr); }
    if (!tr.w) return;
    c.drawImage(img, tr.x, tr.y, tr.w, tr.h, tr.x, tr.y, tr.w, tr.h);
    stats.px += tr.w * tr.h * det;
  };
  const put = (c: CanvasRenderingContext2D, d: RDraw, f: Pose, l: Light, t: number, ox = 0, oy = 0) => {
    const img = bitmap(d.is.rs.st.active[d.i]!.glyph, keyOf(d.is, d.i, f, t, l));
    const hs2 = img.width / 2, inv = 1 / scale;
    const a = vs * f.a * inv, bb = vs * f.b * inv, cc = vs * f.c * inv, dd = vs * f.d * inv;
    det = Math.abs(a * dd - bb * cc);
    c.setTransform(a, bb, cc, dd, vs * f.x + vx - (a * hs2 + cc * hs2) - ox, vs * f.y + vy - (bb * hs2 + dd * hs2) - oy);
    const alpha = Math.min(1, f.opacity + f.spark * MOTION.spark.opacityGain);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = d.alpha === 1 ? alpha : alpha * d.alpha;
    blit(c, img);
  };
  const box = (list: number[]) => {
    let x0 = canvas.width, y0 = canvas.height, x1 = 0, y1 = 0;
    for (const k of list) {
      const f = poses[k]!;
      const r = vs * (FONT * Math.hypot(f.a, f.b) + 4); // Math.max(haloR = 0, 2) * 2
      x0 = Math.min(x0, vs * f.x + vx - r); y0 = Math.min(y0, vs * f.y + vy - r);
      x1 = Math.max(x1, vs * f.x + vx + r); y1 = Math.max(y1, vs * f.y + vy + r);
    }
    const x = Math.max(0, Math.floor(x0)), y = Math.max(0, Math.floor(y0));
    return { x, y, w: Math.max(1, Math.min(canvas.width, Math.ceil(x1)) - x), h: Math.max(1, Math.min(canvas.height, Math.ceil(y1)) - y) };
  };
  const rebuild = (draws: RDraw[], statics: number[], t: number) => {
    statics.sort((p, q) => poses[p]!.z - poses[q]!.z || p - q);
    const all = box(statics);
    const per = ZB.map((_, b) => statics.filter(k => bandOf(poses[k]!.z) === b));
    bands = per.map((list, b) => {
      const own = box(list);
      const sx = Math.max(0, own.x - all.x), sy = Math.max(0, own.y - all.y);
      const sub = { x: sx, y: sy, w: Math.max(0, Math.min(all.w, own.x - all.x + own.w) - sx), h: Math.max(0, Math.min(all.h, own.y - all.y + own.h) - sy) };
      let ink = bands[b]?.ink;
      if (!ink || ink.width !== all.w || ink.height !== all.h) { ink = document.createElement('canvas'); ink.width = all.w; ink.height = all.h; }
      else { const g = ink.getContext('2d')!; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, ink.width, ink.height); }
      return { ink, count: 0, x: all.x, y: all.y, sub };
    });
    for (const k of statics) {
      const b = bands[bandOf(poses[k]!.z)]!;
      b.count++;
      put(b.ink.getContext('2d')!, draws[k]!, poses[k]!, lights[k]!, t, b.x, b.y);
    }
    stats.bandBuilds++;
  };
  const sprite = (color: string, kind: 'frost' | 'bulb') => {
    const k = `${kind}${color}`;
    let s = sprites.get(k);
    if (s) return s;
    const R = Math.max(2, Math.ceil(scale));
    s = document.createElement('canvas');
    s.width = s.height = R * 2;
    const g = s.getContext('2d')!;
    const n2 = parseInt(color.slice(1), 16), rgb = `${(n2 >> 16) & 255},${(n2 >> 8) & 255},${n2 & 255}`;
    const gr = g.createRadialGradient(R, R, 0, R, R, R);
    const stops = kind === 'frost' ? [[0, 1], [0.12, 0.9], [0.3, 0.32], [1, 0]] : [[0, 1], [0.25, 0.8], [0.55, 0.28], [1, 0]];
    for (const [o, a] of stops) gr.addColorStop(o!, `rgba(${rgb},${a})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, R * 2, R * 2);
    if (kind === 'frost') {
      g.globalCompositeOperation = 'lighter';
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const lg = g.createLinearGradient(R - dx! * R, R - dy! * R, R + dx! * R, R + dy! * R);
        lg.addColorStop(0, `rgba(${rgb},0)`); lg.addColorStop(0.5, `rgba(${rgb},0.75)`); lg.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = lg;
        if (dx) g.fillRect(0, R - R * 0.05, R * 2, R * 0.1); else g.fillRect(R - R * 0.05, 0, R * 0.1, R * 2);
      }
    }
    sprites.set(k, s);
    stats.bitmapBuilds++;
    return s;
  };
  const CX0 = VIEW.width / 2, CY0 = VIEW.height / 2;

  /** one frame. `draws` in frame order; `lightList` in frame order; `pulseOf` = any snapshot (pulses depend on t only) */
  const draw = (t: number, draws: RDraw[], lightList: RLight[], pulseOf: IState) => {
    const t0 = performance.now();
    const dpr = window.devicePixelRatio || 1;
    const unit = (cssWidth / VIEW.width) * dpr;
    const w = Math.round(VIEW.width * unit), hgt = Math.round(VIEW.height * unit);
    let dirty = false;
    if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; dirty = true; }
    const want = unit * zoom * HEADROOM;
    if (want !== scale) { scale = want; cache = new Map(); sprites = new Map(); dirty = true; }
    vs = unit * zoom;
    vx = (VIEW.width / 2 - fx * zoom) * unit;
    vy = (VIEW.height / 2 - fy * zoom) * unit;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (pulseOf.rs.st.days <= 0) { stats.lastDraws = 0; return; }
    const n = draws.length;
    while (poses.length < n) { poses.push(newPose()); lights.push({ L: 0, tier: 0 }); }
    if (order.length < n) order = new Int32Array(n * 2);
    const statics: number[] = [];
    let sig = '';
    let m = 0;
    for (let k = 0; k < n; k++) {
      const d = draws[k]!;
      const f = poseI(d.is, d.i, t, poses[k]!);
      if (!d.is.still && d.is.dynamic[d.i] || d.alpha !== 1) {
        let j = m++;
        while (j > 0 && poses[order[j - 1]!]!.z > f.z) { order[j] = order[j - 1]!; j--; }
        order[j] = k;
      } else {
        statics.push(k);
        let id = bandIds.get(d.is);
        if (id == null) { id = bandIds.size; bandIds.set(d.is, id); }
        sig += `${id}.${d.i},`;
      }
    }
    if (dirty || sig !== bandSig || !bands.length) { rebuild(draws, statics, t); bandSig = sig; }
    let o = 0, blits = 0;
    for (let b = 0; b < bands.length; b++) {
      const band = bands[b]!;
      if (band.count) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const u = band.sub;
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (u.w && u.h) ctx.drawImage(band.ink, u.x, u.y, u.w, u.h, band.x + u.x, band.y + u.y, u.w, u.h);
        stats.px += u.w * u.h;
        blits++;
      }
      while (o < m && bandOf(poses[order[o]!]!.z) === b) { const k = order[o]!; put(ctx, draws[k]!, poses[k]!, lights[k]!, t); o++; blits++; }
    }
    pulsesAt(pulseOf, t, pulses);
    if (pulses.length) {
      ctx.setTransform(vs, 0, 0, vs, vx, vy);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 1;
      const c = theme.lighting.pulses.color;
      for (const p of pulses) {
        if (p.a < 0.005) continue;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(${c},${p.a})`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        blits++;
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    const R = Math.max(2, Math.ceil(scale));
    for (const L of lightList) {
      const p = L.is.particles[L.i]!;
      const a0 = particleAlpha(L.is, p, t);
      if (a0 <= 0.02) continue;
      const a = L.alpha === 1 ? a0 : a0 * L.alpha;
      if (a <= 0) continue;
      const k = CAMERA / (CAMERA - p.z);
      const sx = CX0 + (p.x - CX0) * k, sy = CY0 + (p.y - CY0) * k, r = p.size * k;
      ctx.globalAlpha = Math.min(1, a);
      ctx.setTransform((vs * r) / R, 0, 0, (vs * r) / R, vs * (sx - r) + vx, vs * (sy - r) + vy);
      ctx.drawImage(sprite(p.color, p.kind), 0, 0);
      blits++; stats.lightDraws++;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    stats.frames++; stats.draws += blits; stats.lastDraws = blits;
    const ms = performance.now() - t0;
    stats.jsMs += ms; stats.lastMs = ms; stats.maxMs = Math.max(stats.maxMs, ms);
  };
  return {
    stats,
    setView(z: number, x: number, y: number) { if (z !== zoom || x !== fx || y !== fy) { zoom = z; fx = x; fy = y; bandSig = ''; } },
    resize() { cssWidth = canvas.clientWidth || VIEW.width; bandSig = ''; },
    /** fonts became ready: drop every glyph bitmap (same rule as Gate 2I: scale = 0 → rebuild) */
    reset() { scale = 0; bandSig = ''; },
    draw,
  };
}
export type ReplayRenderer = ReturnType<typeof createReplayRenderer>;
