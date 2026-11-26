/**
 * Canvas2D renderer for Gate 2I. Copy of the Gate 2H FrostCanvas pipeline (the 2H file is untouched): one canvas, shared
 * PresentationClock, no per-frame React, static glyphs pre-drawn into 5 depth bands, moving glyphs inserted by CURRENT z.
 * Differences:
 *   · poses / light come from the 2I engine (core movers) — everything else is the 2H H3 call path;
 *   · halo 'minimal' (radius 0, cut > 0) = eraser of the glyph's own footprint (2H only built a mask when radius > 0);
 *   · renderer:
 *       baseline  = the 2H default path, op for op (I0 baseline must equal the 2H H3 page pixel for pixel);
 *       optimized = the SAME ops in the same order, but every blit only covers pixels that can change something:
 *                   glyph bitmaps are drawn through their alpha bounding box (+3 px transparent margin) and each depth
 *                   band canvas (same size and origin as baseline) is copied only over its own content box, at integer
 *                   offsets with the identity transform (a pure copy, no resampling).
 *                   Destination-out / source-over with a fully transparent source leaves the destination unchanged,
 *                   so the output is expected to be identical — verified by tests, never assumed;
 *       single    = Gate 2H "1회 그리기" tier verbatim (halo pre-composited with the CANVAS BACKGROUND COLOUR → depends on
 *                   an opaque single-colour page; reference only).
 * debug: ids (strand A/B/C) · particles · depth · halo (eraser footprints in red) · core (core movers A orange / B blue,
 *        still core ROI green, rest grey). Inspection only, not art.
 */
import { useEffect, useRef } from 'react';
import type { PresentationClock, Stats } from '../../clock';
import { INK } from '../../researchConstants';
import { FONT, VIEW } from '../fullSnowflake/engine';
import { CAMERA } from '../multiHelix/engine';
import { MOTION } from '../layeredCrystal/engine';
import { STRAND_COLORS } from '../../researchConstants';
import { beadsAt, particleAlpha, pulsesAt, rampColor, type Bead, type Pulse } from '../frostedLighting/engine';
import { lightI, newPose, poseI, type IState, type Light, type Pose } from './engine';

export type IDebug = 'off' | 'ids' | 'particles' | 'depth' | 'halo' | 'core';
export type IRender = 'baseline' | 'optimized' | 'single';
export type RefineStats = Stats & { particles: number; beads: number; pulses: number; lightDraws: number; px: number; jsMs: number };
const OTHER = '#5E6B70';
const HEADROOM = 1.15;
const ZB = [-2, 1, 2.5, 4, Infinity];
const bandOf = (z: number) => { let b = 0; while (z >= ZB[b]!) b++; return b; };
const INK_LEVELS = MOTION.spark.levels;
function inkTint(level: number) {
  const n = parseInt(INK.slice(1), 16);
  const f = (level / (INK_LEVELS - 1)) * MOTION.spark.white;
  return `rgb(${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * f)).join(',')})`;
}
type Trim = { x: number; y: number; w: number; h: number };
/** alpha bounding box of a bitmap + 3 px transparent margin (computed once per bitmap). 1 px is NOT enough: under strong
 *  down-scaling Chromium's sub-rect sampling then differs from the whole-bitmap draw (measured); ≥ 2 px gave 0 difference. */
function trimOf(c: HTMLCanvasElement): Trim {
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { x: 0, y: 0, w: 0, h: 0 };
  x0 = Math.max(0, x0 - 3); y0 = Math.max(0, y0 - 3); x1 = Math.min(c.width - 1, x1 + 3); y1 = Math.min(c.height - 1, y1 + 3);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

type Props = { is: IState; clock: PresentationClock; zoom: number; fx: number; fy: number; debug: IDebug; label: string; render?: IRender };

export function RefineCanvas({ is, clock, zoom, fx, fy, debug, label, render = 'baseline' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const stats = clock.stats as RefineStats;
    const family = getComputedStyle(canvas).getPropertyValue('--font-body').trim() || 'sans-serif';
    const { rs, look, theme, still } = is;
    const st = rs.st;
    const n = st.active.length;
    const ids = debug === 'ids', coreDbg = debug === 'core';
    const grey = debug === 'particles';
    const cold = look.light === 'cold' && !ids && !grey && !coreDbg;
    const LV = cold ? theme.lighting.levels : INK_LEVELS;
    const cut = look.halo.cut, haloR = look.halo.radius;
    const hasHalo = cut > 0; // 2H: haloR > 0 && cut > 0 — identical for h3 (0.8 / 0.55) and none (0 / 0); minimal = 0 / 1
    const poses: Pose[] = Array.from({ length: n }, newPose);
    const lights: Light[] = Array.from({ length: n }, () => ({ L: 0, tier: 0 }));
    const dyn = still ? [] : [...Array(n).keys()].filter(i => is.dynamic[i]);
    const order = new Int32Array(dyn.length);
    const roi = new Set(is.roi);
    const pulses: Pulse[] = [];
    const beads: Bead[] = [];
    let cssWidth = canvas.clientWidth || VIEW.width;
    let scale = 0;
    type B = { halo: HTMLCanvasElement | null; looks: HTMLCanvasElement[]; solid: Map<number, HTMLCanvasElement>; size: number };
    let cache = new Map<string, B>();
    let sprites = new Map<string, HTMLCanvasElement>();
    const trims = new WeakMap<HTMLCanvasElement, Trim>();
    const opt = render === 'optimized';
    // research knob (dev only): which optimisation parts are on — ?opt=trim,bands (default both)
    const parts = new URLSearchParams(location.search).get('opt')?.split(',') ?? ['trim', 'bands'];
    const optTrim = opt && parts.includes('trim'), optBands = opt && parts.includes('bands');
    const single = render === 'single' && !ids && !grey && !coreDbg;
    const bg = getComputedStyle(canvas).backgroundColor || theme.background;
    const OPL = 16;
    let bands: { mask: HTMLCanvasElement; ink: HTMLCanvasElement; count: number; x: number; y: number; sub: { x: number; y: number; w: number; h: number } }[] = [];
    let staticCount = 0;

    const colorOf = (key: number) => {
      if (ids || grey || coreDbg) return grey ? OTHER : key < 3 ? STRAND_COLORS[key]! : OTHER;
      if (!cold) return inkTint(key);
      return rampColor(theme, Math.floor(key / 3) / (LV - 1));
    };
    const bitmap = (glyph: string, key: number) => {
      let b = cache.get(glyph);
      const size = Math.ceil(FONT * 2 * scale);
      const canvasOf = () => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d')!; g.font = `480 ${FONT * scale}px ${family}`; g.textAlign = 'center'; g.textBaseline = 'middle'; return { c, g }; };
      if (!b) {
        let halo: HTMLCanvasElement | null = null;
        if (hasHalo) { const { c, g } = canvasOf(); g.fillStyle = '#000'; if (haloR > 0) { g.lineWidth = haloR * 2 * scale; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.strokeText(glyph, size / 2, size / 2); } g.fillText(glyph, size / 2, size / 2); halo = c; stats.bitmapBuilds++; }
        b = { halo, looks: [], solid: new Map(), size };
        cache.set(glyph, b);
      }
      if (!b.looks[key]) {
        const { c, g } = canvasOf();
        g.fillStyle = colorOf(key);
        if (cold) {
          const L = Math.floor(key / 3) / (LV - 1), tier = key % 3;
          const G = theme.lighting.frontGlow;
          if (L <= theme.lighting.backSoft.to) g.filter = `blur(${theme.lighting.backSoft.blur * scale}px)`;
          if (tier) { g.shadowColor = tier === 2 ? G.flashColor : G.color; g.shadowBlur = (tier === 2 ? G.flashBlur : G.blur) * scale; }
          g.fillText(glyph, size / 2, size / 2);
          if (tier === 2) g.fillText(glyph, size / 2, size / 2);
        } else g.fillText(glyph, size / 2, size / 2);
        b.looks[key] = c;
        stats.bitmapBuilds++;
      }
      return b;
    };
    const keyOf = (i: number, f: Pose, t: number) => {
      if (ids) { const q = rs.strandOfGlyph[i]!; return q >= 0 ? Math.min(3, rs.strands[q]!.k) : 3; }
      if (coreDbg) { const m = is.moverOf[i]!; return m >= 0 ? (is.movers[m]!.group ? 2 : 0) : roi.has(i) ? 1 : 3; }
      if (grey) return 3;
      const l = lightI(is, i, t, f, lights[i]!);
      const level = Math.round(Math.max(0, Math.min(1, l.L)) * (LV - 1));
      return cold ? level * 3 + l.tier : level;
    };
    /** one bitmap blit at the current transform: baseline = whole bitmap, optimized = its alpha box only (same pixels) */
    let det = 1;
    const blit = (c: CanvasRenderingContext2D, img: HTMLCanvasElement) => {
      if (!optTrim) { c.drawImage(img, 0, 0); stats.px += img.width * img.height * det; return; }
      let tr = trims.get(img);
      if (!tr) { tr = trimOf(img); trims.set(img, tr); }
      if (!tr.w) return;
      c.drawImage(img, tr.x, tr.y, tr.w, tr.h, tr.x, tr.y, tr.w, tr.h);
      stats.px += tr.w * tr.h * det;
    };
    let vs = 1, vx = 0, vy = 0;
    const put = (c: CanvasRenderingContext2D, i: number, f: Pose, t: number, mode: 'mask' | 'ink' | 'both', ox = 0, oy = 0) => {
      const key = keyOf(i, f, t);
      const b = bitmap(st.active[i]!.glyph, key);
      const hs2 = b.size / 2;
      const inv = 1 / scale;
      const a = vs * f.a * inv, bb = vs * f.b * inv, cc = vs * f.c * inv, d = vs * f.d * inv;
      det = Math.abs(a * d - bb * cc);
      c.setTransform(a, bb, cc, d, vs * f.x + vx - (a * hs2 + cc * hs2) - ox, vs * f.y + vy - (bb * hs2 + d * hs2) - oy);
      const alpha = Math.min(1, f.opacity + f.spark * MOTION.spark.opacityGain);
      if (mode === 'mask') { if (b.halo) { c.globalAlpha = 1; blit(c, b.halo); } return; }
      if (single && mode === 'both') {
        const ol = Math.round(alpha * (OPL - 1));
        const sk = key * OPL + ol;
        let sb = b.solid.get(sk);
        if (!sb) {
          sb = document.createElement('canvas');
          sb.width = sb.height = b.size;
          const g = sb.getContext('2d')!;
          if (b.halo) { g.globalAlpha = cut; g.drawImage(b.halo, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.fillStyle = bg; g.fillRect(0, 0, b.size, b.size); g.globalCompositeOperation = 'source-over'; }
          g.globalAlpha = ol / (OPL - 1);
          g.drawImage(b.looks[key]!, 0, 0);
          b.solid.set(sk, sb);
          stats.bitmapBuilds++;
        }
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        c.drawImage(sb, 0, 0);
        stats.px += sb.width * sb.height * det;
        return;
      }
      if (b.halo) { // also inside a static band canvas ('ink'): later glyphs of the band cut earlier ones (2G behaviour)
        c.globalAlpha = cut;
        c.globalCompositeOperation = 'destination-out';
        blit(c, b.halo);
      }
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = alpha;
      blit(c, b.looks[key]!);
    };

    const rebuild = (t: number) => {
      const dynSet = new Set(dyn);
      const statics: number[] = [];
      for (let i = 0; i < n; i++) { if (dynSet.has(i)) continue; poseI(is, i, t, poses[i]!); statics.push(i); }
      statics.sort((p, q) => poses[p]!.z - poses[q]!.z || p - q);
      staticCount = statics.length;
      const box = (list: number[]) => {
        let x0 = canvas.width, y0 = canvas.height, x1 = 0, y1 = 0;
        for (const i of list) {
          const f = poses[i]!;
          const r = vs * (FONT * Math.hypot(f.a, f.b) + Math.max(haloR, 2) * 2);
          x0 = Math.min(x0, vs * f.x + vx - r); y0 = Math.min(y0, vs * f.y + vy - r);
          x1 = Math.max(x1, vs * f.x + vx + r); y1 = Math.max(y1, vs * f.y + vy + r);
        }
        const x = Math.max(0, Math.floor(x0)), y = Math.max(0, Math.floor(y0));
        return { x, y, w: Math.max(1, Math.min(canvas.width, Math.ceil(x1)) - x), h: Math.max(1, Math.min(canvas.height, Math.ceil(y1)) - y) };
      };
      const all = box(statics); // one shared box for every band (2H) — kept in both renderers so every glyph lands on the same sub-pixel
      const per = ZB.map((_, b) => statics.filter(i => bandOf(poses[i]!.z) === b));
      bands = per.map(list => {
        const mk = () => { const c = document.createElement('canvas'); c.width = all.w; c.height = all.h; return c; };
        const own = box(list); // optimized: only this band's content box is copied each frame
        const sx = Math.max(0, own.x - all.x), sy = Math.max(0, own.y - all.y);
        const sub = optBands ? { x: sx, y: sy, w: Math.max(0, Math.min(all.w, own.x - all.x + own.w) - sx), h: Math.max(0, Math.min(all.h, own.y - all.y + own.h) - sy) } : { x: 0, y: 0, w: all.w, h: all.h };
        return { mask: mk(), ink: mk(), count: 0, x: all.x, y: all.y, sub };
      });
      for (const i of statics) {
        const b = bands[bandOf(poses[i]!.z)]!;
        b.count++;
        put(b.mask.getContext('2d')!, i, poses[i]!, t, 'mask', b.x, b.y);
        put(b.ink.getContext('2d')!, i, poses[i]!, t, 'ink', b.x, b.y);
      }
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
    const ring = (x: number, y: number, r: number, color: string) => { ctx.strokeStyle = color; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke(); };
    const CX0 = VIEW.width / 2, CY0 = VIEW.height / 2;
    const drawLights = (t: number) => {
      let m = 0;
      const one = (x: number, y: number, z: number, size: number, a: number, color: string, kind: 'frost' | 'bulb', mark: string) => {
        const k = CAMERA / (CAMERA - z);
        const sx = CX0 + (x - CX0) * k, sy = CY0 + (y - CY0) * k, r = size * k;
        if (grey) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setTransform(vs, 0, 0, vs, vx, vy); ring(sx, sy, Math.max(1.6, r), mark); m++; return; }
        ctx.globalAlpha = Math.min(1, a);
        ctx.setTransform(vs * r / Math.max(2, Math.ceil(scale)), 0, 0, vs * r / Math.max(2, Math.ceil(scale)), vs * (sx - r) + vx, vs * (sy - r) + vy);
        ctx.drawImage(sprite(color, kind), 0, 0);
        m++;
      };
      ctx.globalCompositeOperation = 'lighter';
      let np = 0;
      for (const p of is.particles) { const a = particleAlpha(is, p, t); if (a <= 0.02 && !grey) continue; one(p.x, p.y, p.z, p.size, a, p.color, p.kind, p.pastel ? '#FF4FD8' : '#3FE0FF'); np++; }
      beadsAt(is, t, beads);
      for (const b of beads) one(b.x, b.y, b.z, b.size, b.a, b.color, 'bulb', '#FFE14F');
      stats.particles = np; stats.beads = beads.length; stats.lightDraws += m;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      return m;
    };

    const drawDebug = (t: number) => {
      ctx.setTransform(vs, 0, 0, vs, vx, vy);
      ctx.globalCompositeOperation = 'source-over';
      if (debug === 'depth') for (let i = 0; i < n; i++) {
        const f = poseI(is, i, t, poses[i]!);
        const q = Math.max(0, Math.min(1, (f.z + 9) / 14));
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = `rgb(${Math.round(60 + 195 * q)},${Math.round(110 + 145 * q)},${Math.round(200 + 55 * q)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 1.1, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.globalAlpha = 0.7; ctx.lineWidth = 0.5; ctx.strokeStyle = '#7FA7B8'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, st.top); ctx.lineTo(VIEW.width, st.top); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    /** debug=halo: every eraser footprint (what the halo removes behind a glyph) tinted red on top of the frame */
    let redHalo = new Map<string, HTMLCanvasElement>();
    const drawHaloDebug = (t: number) => {
      if (!hasHalo) return;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < n; i++) {
        const f = poseI(is, i, t, poses[i]!);
        const b = bitmap(st.active[i]!.glyph, 3 * 0);
        let r = redHalo.get(st.active[i]!.glyph);
        if (!r) { r = document.createElement('canvas'); r.width = r.height = b.size; const g = r.getContext('2d')!; g.drawImage(b.halo!, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#FF3B3B'; g.fillRect(0, 0, b.size, b.size); redHalo.set(st.active[i]!.glyph, r); }
        const hs2 = b.size / 2, inv = 1 / scale;
        const a = vs * f.a * inv, bb = vs * f.b * inv, cc = vs * f.c * inv, d = vs * f.d * inv;
        ctx.setTransform(a, bb, cc, d, vs * f.x + vx - (a * hs2 + cc * hs2), vs * f.y + vy - (bb * hs2 + d * hs2));
        ctx.globalAlpha = 0.22 * cut;
        ctx.drawImage(r, 0, 0);
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number) => {
      const t0 = performance.now();
      const dpr = window.devicePixelRatio || 1;
      const unit = (cssWidth / VIEW.width) * dpr;
      const w = Math.round(VIEW.width * unit), hgt = Math.round(VIEW.height * unit);
      let dirty = false;
      if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; dirty = true; }
      const want = unit * zoom * HEADROOM;
      if (want !== scale) { scale = want; cache = new Map(); sprites = new Map(); redHalo = new Map(); dirty = true; }
      vs = unit * zoom;
      vx = (VIEW.width / 2 - fx * zoom) * unit;
      vy = (VIEW.height / 2 - fy * zoom) * unit;
      if (dirty || !bands.length) rebuild(t);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (st.days <= 0) { if (debug === 'depth') drawDebug(t); stats.lastRendered = 0; stats.particles = 0; stats.beads = 0; stats.pulses = 0; return; }
      let m = 0;
      for (const i of dyn) {
        const f = poseI(is, i, t, poses[i]!);
        let j = m++;
        while (j > 0 && poses[order[j - 1]!]!.z > f.z) { order[j] = order[j - 1]!; j--; }
        order[j] = i;
      }
      let o = 0, blits = 0;
      for (let b = 0; b < bands.length; b++) {
        const band = bands[b]!;
        if (band.count) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const u = band.sub;
          const copy = (img: HTMLCanvasElement) => { if (optBands) { if (u.w && u.h) ctx.drawImage(img, u.x, u.y, u.w, u.h, band.x + u.x, band.y + u.y, u.w, u.h); } else ctx.drawImage(img, band.x, band.y); stats.px += u.w * u.h; };
          if (hasHalo) { ctx.globalAlpha = cut; ctx.globalCompositeOperation = 'destination-out'; copy(band.mask); blits++; }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
          copy(band.ink);
          blits++;
        }
        while (o < m && bandOf(poses[order[o]!]!.z) === b) { put(ctx, order[o]!, poses[order[o]!]!, t, 'both'); o++; blits += single || !hasHalo ? 1 : 2; }
      }
      pulsesAt(is, t, pulses);
      if (!ids && !grey && !coreDbg && pulses.length) {
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
      stats.pulses = pulses.length;
      blits += drawLights(t);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      stats.drawCalls += blits;
      stats.lastRendered = staticCount + m;
      if (debug === 'depth' || grey || coreDbg) drawDebug(t);
      if (debug === 'halo') drawHaloDebug(t);
      stats.jsMs += performance.now() - t0;
    };

    const unsubscribe = clock.subscribe(draw);
    let alive = true;
    void document.fonts?.ready.then(() => { if (alive) { scale = 0; draw(clock.t); } });
    const onResize = () => { cssWidth = canvas.clientWidth || VIEW.width; draw(clock.t); };
    window.addEventListener('resize', onResize);
    return () => { alive = false; unsubscribe(); window.removeEventListener('resize', onResize); };
  }, [is, clock, zoom, fx, fy, debug, render]);

  return <canvas ref={ref} data-testid="flake-canvas" role="img" aria-label={label}
    style={{ display: 'block', width: '100%', aspectRatio: `${VIEW.width} / ${VIEW.height}`, background: 'var(--flake-bg, var(--background))' }} />;
}
