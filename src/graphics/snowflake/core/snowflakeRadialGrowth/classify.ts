/**
 * Gate 3B — structural classification of the Gate 2I I3 slots (December F2 snowflake). Dev-only, pure.
 * Derived from the REAL geometry (2E STROKES + 2F F2 core detail + 2G strands), not from names alone:
 *   r 0 nucleus · r 6 ros (arm axis) · r 10 micro (30° between arms) · r 12 spk0 · r 15.6–18 ihex edge (vertex k → k+1)
 *   r 20.5 rib (30°) · r 24 spk1 · r 31–36 ohex edge (3 strand layers) · r 33–44 root plate (depth layer)
 *   arm k: spine cells every 6 units r 42…126 (3 strand layers) · spine depth layer r 45–70 · branches b0 (root u 54)
 *   b1 (72) b2 (90) b3 (102, one texture glyph per side) · tip plate (depth layer, r 114–126).
 * The 2F auxiliary band slots are dropped by 2G R2 (no glyph in I3) and get motif 'band' (never shown).
 * Motif graph: nucleus is the root; every motif names its structural parent (the motif it physically grows from).
 */
import { CX, CY } from '../fullSnowflake/engine';
import { SHAPE, toWorld } from '../livingTypography/engine';
import type { FSlot } from '../layeredCrystal/engine';

export type MotifType = 'core_hex' | 'core_spoke' | 'arm_root' | 'primary_spine' | 'branch_inner' | 'branch_outer' | 'tip_plate' | 'micro_detail';
export type RadialBand = 'core' | 'inner' | 'mid' | 'outer';
export type Motif = { id: string; type: MotifType; parent: string | null; arm: number; depth: boolean };

/** spine cells sit every 6 units from r 42; thresholds are midway between cells (robust to float error) */
const SPINE_CUT = [51, 69, 87, 99]; // spine0 = arm root (42, 48) · spine1 (54–66) · spine2 (72–84) · spine3 (90, 96) · spine4 (102–126)
const spineSeg = (r: number) => SPINE_CUT.filter(c => r > c).length;
export const radius = (s: { x: number; y: number }) => Math.hypot(s.x - CX, s.y - CY);
export function bandOf(r: number): RadialBand { return r < 40 ? 'core' : r < 75 ? 'inner' : r < 100 ? 'mid' : 'outer'; }

/** motif of a slot (pure function of its geometry) */
export function motifOfSlot(s: FSlot): Motif {
  const k = s.arm;
  const part = s.stroke.replace(/^a\d-/, '');
  const r = radius(s);
  const M = (id: string, type: MotifType, parent: string | null, depth = false): Motif => ({ id, type, parent, arm: k, depth });
  if (s.layer === 'band') return M('band', 'micro_detail', null);
  if (part === 'nucleus') return { id: 'nucleus', type: 'core_hex', parent: null, arm: -1, depth: false };
  if (part === 'ros') return M(`${k}:ros`, 'core_hex', 'nucleus');
  if (part === 'micro') return M(`${k}:micro`, 'micro_detail', 'nucleus');
  if (part === 'spk0') return M(`${k}:spk0`, 'core_spoke', `${k}:ros`);
  // hex rings: an edge runs from vertex k to vertex k+1 → each half belongs to the vertex it touches (a "V" around the
  // arm axis), so a hex motif grows out of its own spoke and an arm root always sits on a closed V of the outer hex
  if (part === 'ihex' || part === 'ohex') {
    const R = part === 'ihex' ? SHAPE.innerHex.r : SHAPE.outerHex.r;
    const [ax, ay] = toWorld(k, R, 0), [bx, by] = toWorld((k + 1) % 6, R, 0);
    const v = Math.hypot(s.x - ax, s.y - ay) < Math.hypot(s.x - bx, s.y - by) - 1e-6 ? k : (k + 1) % 6;
    return part === 'ihex' ? { id: `${v}:ihex`, type: 'core_hex', parent: `${v}:spk0`, arm: v, depth: false } : { id: `${v}:ohex`, type: 'core_hex', parent: `${v}:spk1`, arm: v, depth: false };
  }
  if (/^rib\d$/.test(part)) return M(`${k}:rib`, 'core_spoke', `${k}:ihex`); // rib k (30° past arm k) sits on the inner hex edge k
  if (part === 'spk1') return M(`${k}:spk1`, 'core_spoke', `${k}:ihex`);
  if (part === 'rootplate') return M(`${k}:root~d`, 'arm_root', `${k}:root`, true);
  if (part === 'spine') {
    const seg = spineSeg(r);
    if (s.layer === 'depth') return seg === 0 ? M(`${k}:root~d`, 'arm_root', `${k}:root`, true) : M(`${k}:spine${seg}~d`, 'primary_spine', `${k}:spine${seg}`, true);
    if (seg === 0) return M(`${k}:root`, 'arm_root', `${k}:ohex`);
    return M(`${k}:spine${seg}`, 'primary_spine', seg === 1 ? `${k}:root` : `${k}:spine${seg - 1}`);
  }
  const b = /^b(\d)([LR])$/.exec(part);
  if (b) {
    const i = Number(b[1]);
    const parent = `${k}:spine${i + 1}`; // b0 roots at u 54 (spine1) … b3 at u 102 (spine4)
    return M(`${k}:b${i}${b[2]}`, i < 2 ? 'branch_inner' : 'branch_outer', parent);
  }
  if (part === 'tipplate') return M(`${k}:tip~d`, 'tip_plate', `${k}:spine4`, true);
  return M(`${k}:${part}`, 'micro_detail', `${k}:spine4`); // not present in I3 (sprigs / rosettes are not drawn) — kept for safety
}

export type SlotMeta = { motif: string; parent: string | null; type: MotifType; arm: number; r: number; band: RadialBand; depthLayer: number };
/** per slot metadata; depthLayer = 2G strand layer k (0 A · 1 B · 2 C), 3 = 2E depth layer, −1 = single layer */
export function classifySlots(slots: FSlot[], strandLayer: Int8Array): SlotMeta[] {
  return slots.map((s, i) => {
    const m = motifOfSlot(s);
    const r = radius(s);
    return { motif: m.id, parent: m.parent, type: m.type, arm: m.arm, r, band: bandOf(r), depthLayer: s.layer === 'depth' ? 3 : strandLayer[i]! };
  });
}

/** the motif graph of a slot set (id → parent / type / slot count / radius range) */
export function motifGraph(slots: FSlot[]) {
  const g = new Map<string, Motif & { slots: number; rMin: number; rMax: number }>();
  for (const s of slots) {
    const m = motifOfSlot(s);
    if (m.id === 'band') continue;
    const r = radius(s);
    const e = g.get(m.id);
    if (e) { e.slots++; e.rMin = Math.min(e.rMin, r); e.rMax = Math.max(e.rMax, r); } else g.set(m.id, { ...m, slots: 1, rMin: r, rMax: r });
  }
  return g;
}
