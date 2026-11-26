/**
 * Gate 2C — adaptive snowflake density (docs/spec/23 v1.6). Dev-only, pure, deterministic.
 *
 * Built ON TOP of the Gate 2B module without modifying it: same 42 axes (6 arms + 36 twigs), same projection, growth
 * boundary, glyph size and renderer. Only the source → slot assignment differs:
 *   G0 = Gate 2B allocation as is (reference).
 *   G1 = ANCHOR strands only. Each entry gets a phrase-bounded prefix of its own text (≤ ANCHOR_MAX glyphs) laid on
 *        stable slots: piece 1 in the region open on its creation day (next to the boundary), the rest RESERVED in the
 *        region that opens after the NEXT day (so the next date always keeps its own band) → revealed later in place.
 *   G2 = G1 + ECHO strands: whole natural phrases of the real entries repeated in the still-empty OPEN slots, outer
 *        parts first, centre and twig roots excluded, up to a glyph safety cap. Echo is recomputed from the anchor
 *        state (it yields to anchors), anchors never move.
 * Every glyph keeps entryId + grapheme range + copyIndex (0 = anchor). No text is generated, summarised or padded.
 * All numbers are [연구안] starting values, not approved art.
 */
import { graphemes } from '../../engine';
import type { StudyDataset } from '../../studyFixtures';
import type { Entry } from '../multiHelix/engine';
import { multiHelixEntries } from '../multiHelix/fixtures';
import {
  CX, CY, GEOMETRY, TARGET_DAYS, TRACKS, ZERO, activeGlyphs as g0Active, allocate as g0Allocate, buildGlyphs as g0Build, newFrame, openArc, projectFlake,
  revealTop, topAt, type FlakeGlyph, type Track,
} from '../fullSnowflake/engine';
import { CULL } from '../multiHelix/engine';

export const ART_VERSION = 'adaptive-snowflake-v1.6';
export type Group = 'G0' | 'G1' | 'G2';
export type Dataset = StudyDataset | 'ultrashort';

const ADVANCE = 8; // = Gate 2B
const SPACE = 4;
const GAP = 6;
const MIN_PIECE = 3;
const TWIG_PENALTY = 24;
const BAND = 24;
export const PHRASE = { min: 6, max: 12, tiny: 3, merge: 16 } as const; // visible graphemes (spec 23 §3: 6–12 is a target, not a cut rule)
export const ANCHOR_MAX = 24; // anchor = whole phrases from the start of the entry, up to this many visible glyphs
const READ_PENALTY = 16; // anchors prefer axes whose text runs close to horizontal (|v.y| → 1)
export const CENTER_R = 28; // arm part closer to the centre than this: no echo, anchors penalised
const CENTER_PENALTY = 40;
export const TWIG_ROOT_SKIP = 5; // twig part next to its arm (world units along the twig): no echo
export const GLYPH_CAP = 640; // safety cap on drawn glyphs (anchor + echo) — about Gate 2B's long-text 15-day state
const SAME_TRACK_BONUS = 6;

// ───────────────────────────── fixtures ─────────────────────────────

/** Spec 19 Appendix A bodies. 'ultrashort' = the first 2–3-grapheme word of each body (a real contiguous substring). */
export function adaptiveEntries(days: number, extra: number, dataset: Dataset): Entry[] {
  if (dataset !== 'ultrashort') return multiHelixEntries(days, extra, dataset);
  return multiHelixEntries(days, extra, 'base').map(e => ({ ...e, body: ultraShort(e.body) }));
}
export function ultraShort(body: string): string {
  const words = body.split(' ');
  return words.find(w => { const n = graphemes(w).length; return n >= 2 && n <= 3; }) ?? graphemes(body).slice(0, 2).map(g => g.text).join('');
}
export const distinctDays = (entries: Entry[]) => new Set(entries.map(e => e.entryDate)).size;

// ───────────────────────────── phrases (spec 23 §3) ─────────────────────────────

export type Phrase = { index: number; start: number; end: number; visible: number; text: string };
const BREAK = /[.!?,…。！？、]$/u;

/**
 * Deterministic natural phrases: whitespace words joined in original order until ≥ PHRASE.min visible graphemes
 * (never above PHRASE.max unless one word is longer), cut after . ! ? , ; too-short leftovers merge with a neighbour.
 * start/end are grapheme indices of graphemes(body); text is exactly that slice (no added or removed characters).
 */
export function phrases(body: string): Phrase[] {
  const g = graphemes(body);
  const words: [number, number][] = [];
  for (let i = 0; i < g.length;) {
    if (g[i]!.text === ' ') { i++; continue; }
    let j = i;
    while (j < g.length && g[j]!.text !== ' ') j++;
    words.push([i, j]);
    i = j;
  }
  const out: [number, number, number][] = [];
  let cur: [number, number, number] | null = null;
  for (const [a, b] of words) {
    if (cur && cur[2] + (b - a) > PHRASE.max) { out.push(cur); cur = null; }
    cur = cur ? [cur[0], b, cur[2] + b - a] : [a, b, b - a];
    if (cur[2] >= PHRASE.min || BREAK.test(g[b - 1]!.text)) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  for (let i = 0; i < out.length && out.length > 1; i++) {
    const p = out[i]!;
    if (p[2] >= PHRASE.tiny) continue;
    const prev = out[i - 1];
    const next = out[i + 1];
    if (prev && prev[2] + p[2] <= PHRASE.merge) { prev[1] = p[1]; prev[2] += p[2]; out.splice(i--, 1); }
    else if (next && next[2] + p[2] <= PHRASE.merge) { next[0] = p[0]; next[2] += p[2]; out.splice(i--, 1); }
  }
  return out.map(([start, end, visible], index) => ({ index, start, end, visible, text: g.slice(start, end).map(x => x.text).join('') }));
}

/** Anchor source range: whole phrases from the start, ≤ ANCHOR_MAX visible graphemes (at least the first phrase). */
export function anchorRange(ph: Phrase[]): [number, number] {
  if (!ph.length) return [0, 0];
  let end = ph[0]!.end;
  let n = ph[0]!.visible;
  for (const p of ph.slice(1)) { if (n + p.visible > ANCHOR_MAX) break; end = p.end; n += p.visible; }
  return [ph[0]!.start, end];
}

// ───────────────────────────── track helpers ─────────────────────────────

const advanceOf = (g: string) => (g === ' ' ? SPACE : ADVANCE);
const sAt = (t: Track, a: number) => (t.pitch * a) / t.arc;
const aOfS = (t: Track, s: number) => (s * t.arc) / t.pitch;
const rAt = (t: Track, a: number) => { const s = sAt(t, a); return Math.hypot(t.lx + s * t.vx - CX, t.ly + s * t.vy - CY); };
const innerIsLow = (t: Track) => rAt(t, 0) < rAt(t, t.aMax);
type Chars = { text: string; offset: number }[];
const visibleIn = (c: Chars, a: number, b: number) => { let n = 0; for (let i = a; i < b; i++) if (c[i]!.text !== ' ') n++; return n; };
const advIn = (c: Chars, a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += advanceOf(c[i]!.text); return s; };

/** Arc range of a track where echo may go (centre of arms and twig roots excluded). */
function echoZone(t: Track): [number, number] {
  const skip = aOfS(t, t.kind === 'arm' ? CENTER_R - GEOMETRY.arm.inner : TWIG_ROOT_SKIP);
  return innerIsLow(t) ? [skip, t.aMax] : [0, t.aMax - skip];
}

function penalty(t: Track, aLo: number, aHi: number) {
  let p = (t.kind === 'twig' ? TWIG_PENALTY : 0) + READ_PENALTY * (1 - Math.abs(t.vy));
  if (t.kind === 'arm' && Math.min(rAt(t, aLo), rAt(t, aHi)) < CENTER_R) p += CENTER_PENALTY;
  return p;
}

type Interval = [number, number];
function freeGaps(used: Interval[], lo: number, hi: number): Interval[] {
  const gaps: Interval[] = [];
  let a = 0;
  for (const [l, h] of [...used].sort((x, y) => x[0] - y[0])) { gaps.push([a, l - GAP]); a = Math.max(a, h + GAP); }
  gaps.push([a, Infinity]);
  return gaps.map(([x, y]): Interval => [Math.max(x, lo), Math.min(y, hi)]).filter(([x, y]) => y - x >= ADVANCE - 1e-6);
}

/** How many graphemes from i (< end) fit in room; prefers a word-boundary cut when the rest does not fit. */
function fit(c: Chars, i: number, end: number, room: number): { n: number; adv: number } {
  let adv = 0;
  let n = 0;
  while (i + n < end && adv + advanceOf(c[i + n]!.text) <= room + 1e-6) adv += advanceOf(c[i + n++]!.text);
  if (i + n < end) {
    let cut = n;
    while (cut > 0 && c[i + cut]?.text !== ' ' && c[i + cut - 1]?.text !== ' ') cut--;
    if (cut > 0 && visibleIn(c, i, i + cut) >= MIN_PIECE) { n = cut; adv = advIn(c, i, i + n); }
  }
  while (n > 0 && c[i + n - 1]!.text === ' ') adv -= advanceOf(c[i + --n]!.text);
  return { n, adv };
}

// ───────────────────────────── anchors + ledger (spec 23 §4, §6) ─────────────────────────────

export type APiece = { track: number; aLo: number; aHi: number; from: number; to: number; future: boolean };
export type ARecord = { entryId: string; body: string; day: number; range: [number, number]; pieces: APiece[]; unplaced: number };
export type Ledger = Map<string, ARecord>;

const byWriting = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** Lowest arc a piece may start at so that none of its glyphs is visible before day d+2 (or d+1 near the target). */
function futureLo(t: Track, day: number) {
  if (day >= TARGET_DAYS) return 0;
  return Math.max(0, openArc(t, day + 1 < TARGET_DAYS ? day + 1 : day));
}

function placeVisible(c: Chars, i: number, end: number, day: number, used: (ti: number) => Interval[]): APiece | null {
  const cands: { track: number; aHi: number; adv: number; n: number; y: number; use: number }[] = [];
  for (const t of TRACKS) {
    const open = openArc(t, day);
    if (open < ADVANCE / 2) continue;
    const u = used(t.index);
    const use = u.reduce((s, [l, h]) => s + h - l, 0) / t.aMax;
    for (const [gLo, gHi] of freeGaps(u, 0, open + ADVANCE / 2)) {
      const f = fit(c, i, end, gHi - gLo);
      if (visibleIn(c, i, i + f.n) < 1) continue;
      const aHi = gHi - gLo - f.adv < MIN_PIECE * ADVANCE + GAP ? gLo + f.adv : gHi;
      cands.push({ track: t.index, aHi, ...f, use, y: t.ly + sAt(t, gHi) * t.vy + penalty(t, aHi - f.adv, aHi) });
    }
  }
  if (!cands.length) return null;
  const yBest = Math.min(...cands.map(x => x.y));
  const b = cands.filter(x => x.y <= yBest + BAND).sort((p, q) => p.use - q.use || p.y - q.y || p.track - q.track)[0]!;
  return { track: b.track, aLo: b.aHi - b.adv, aHi: b.aHi, from: i, to: i + b.n, future: false };
}

function placeFuture(c: Chars, i: number, end: number, day: number, used: (ti: number) => Interval[], prevTrack: number, lowFor: (t: Track) => number): APiece | null {
  let best: { track: number; aLo: number; adv: number; n: number; score: number } | null = null;
  const left = visibleIn(c, i, end);
  for (const t of TRACKS) {
    for (const [gLo, gHi] of freeGaps(used(t.index), lowFor(t), t.aMax)) {
      const f = fit(c, i, end, gHi - gLo);
      if (visibleIn(c, i, i + f.n) < Math.min(MIN_PIECE, left)) continue;
      // earliest reveal first (lowest glyph top = largest screen y), then readable/outer axes, then stay on the same axis
      const score = -topAt(t, gLo + ADVANCE / 2) + penalty(t, gLo, gLo + f.adv) - (t.index === prevTrack ? SAME_TRACK_BONUS : 0);
      if (!best || score < best.score - 1e-9) best = { track: t.index, aLo: gLo, ...f, score };
    }
  }
  return best && { track: best.track, aLo: best.aLo, aHi: best.aLo + best.adv, from: i, to: i + best.n, future: topAt(TRACKS[best.track]!, best.aLo + ADVANCE / 2) < revealTop(day) };
}

const skipSpace = (c: Chars, i: number, end: number) => { while (i < end && c[i]!.text === ' ') i++; return i; };

/** Fill existing slots (edit) in order with the anchor text; returns the first grapheme that did not fit. */
function reflow(c: Chars, i: number, end: number, pieces: APiece[]): number {
  for (const p of pieces) {
    i = skipSpace(c, i, end);
    const f = fit(c, i, end, p.aHi - p.aLo);
    p.from = i;
    p.to = i + f.n;
    i += f.n;
  }
  return skipSpace(c, i, end);
}

/**
 * Append-only anchor ledger in writing order. Records in `prev` keep their slots; an edited body is re-flowed into its
 * own slots (overflow → new reserved pieces, never another entry's slots); deleted entries simply drop out.
 * `day` = order of first appearance of the entry's date (stable slot assignment only, not a completion policy).
 */
export function allocateAnchors(entries: Entry[], prev?: Ledger): Ledger {
  const ledger: Ledger = new Map();
  const present = new Set(entries.map(e => e.id));
  for (const [id, r] of prev ?? []) if (present.has(id)) ledger.set(id, r);
  const used = (ti: number): Interval[] => { const out: Interval[] = []; for (const r of ledger.values()) for (const p of r.pieces) if (p.track === ti) out.push([p.aLo, p.aHi]); return out; };
  const sorted = [...entries].sort(byWriting);
  const seen: string[] = [];
  const now = distinctDays(entries);
  for (const e of sorted) {
    if (!seen.includes(e.entryDate)) seen.push(e.entryDate);
    const old = ledger.get(e.id);
    if (old && old.body === e.body) continue;
    const c = graphemes(e.body);
    const range = anchorRange(phrases(e.body));
    const rec: ARecord = old
      ? { ...old, body: e.body, range, pieces: old.pieces.map(p => ({ ...p })), unplaced: 0 }
      : { entryId: e.id, body: e.body, day: seen.length, range, pieces: [], unplaced: 0 };
    ledger.set(e.id, rec);
    let i = old ? reflow(c, range[0], range[1], rec.pieces) : skipSpace(c, range[0], range[1]);
    const day = old ? now : rec.day;
    if (!old && i < range[1]) {
      const p = placeVisible(c, i, range[1], day, used);
      if (p) { rec.pieces.push(p); i = skipSpace(c, p.to, range[1]); }
    }
    // reserved continuation; an entry with nothing visible yet may use the next day's band (earliest possible reveal)
    const lowFor = rec.pieces.length ? (t: Track) => futureLo(t, day) : (t: Track) => Math.max(0, openArc(t, day));
    while (i < range[1]) {
      // no reservable future slot left (late days: only the top of the upper arm is still closed) → any free slot
      const p = placeFuture(c, i, range[1], day, used, rec.pieces.at(-1)?.track ?? -1, lowFor) ?? placeFuture(c, i, range[1], day, used, rec.pieces.at(-1)?.track ?? -1, () => 0);
      if (!p) break;
      rec.pieces.push(p);
      i = skipSpace(c, p.to, range[1]);
    }
    rec.unplaced = visibleIn(c, i, range[1]);
  }
  return ledger;
}

// ───────────────────────────── echo (spec 23 §5) ─────────────────────────────

export type EPiece = { entryId: string; unit: string; track: number; aLo: number; aHi: number; from: number; to: number; copyIndex: number; slot: string };

function h(text: string): number {
  let x = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
  x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

/**
 * Echo source units of one entry: its natural phrases ('p<i>') and, as a fallback for gaps too short for a phrase, its
 * single words of ≥ 2 visible graphemes ('w<start>') — always contiguous original text, never joined across entries.
 */
export type Unit = { id: string; start: number; end: number; visible: number; text: string };
export function echoUnits(body: string): Unit[] {
  const ph = phrases(body);
  const g = graphemes(body);
  const units: Unit[] = ph.map(p => ({ id: `p${p.index}`, start: p.start, end: p.end, visible: p.visible, text: p.text }));
  for (let i = 0; i < g.length;) {
    if (g[i]!.text === ' ') { i++; continue; }
    let j = i;
    while (j < g.length && g[j]!.text !== ' ') j++;
    if (j - i >= 2 && !ph.some(p => p.start === i && p.end === j)) units.push({ id: `w${i}`, start: i, end: j, visible: j - i, text: g.slice(i, j).map(x => x.text).join('') });
    i = j;
  }
  return units;
}

/** Echo fill order: outer twigs → inner twigs → arms, arms interleaved so the cap cuts all six evenly. */
const ECHO_ORDER = [...TRACKS].sort((a, b) => (a.kind === 'arm' ? 9 : 2 - a.level) - (b.kind === 'arm' ? 9 : 2 - b.level) || a.arm - b.arm || a.index - b.index);

/**
 * Density-adaptive echo: every still-empty slot of the OPEN region (outside the centre / twig roots) is a deficit;
 * whole phrases are laid from each axis' outer end inward, one phrase per axis per round, until no deficit is left or
 * the drawn-glyph cap is reached. So the amount follows the text length, the day and the anchors — no fixed n.
 * Phrase choice per slot = rendezvous hash over (slot, entry) then (slot, phrase): deterministic, spread over entries,
 * and a new entry only takes over the slots it wins (small change). The same phrase is not repeated back to back on an
 * axis when any alternative fits.
 */
export function placeEcho(entries: Entry[], ledger: Ledger, days: number, anchorsShown: number, cap = GLYPH_CAP): EPiece[] {
  if (days <= 0) return [];
  const src = [...entries].sort((a, b) => a.id.localeCompare(b.id)).map(e => ({ id: e.id, c: graphemes(e.body), ph: echoUnits(e.body) })).filter(e => e.ph.length);
  if (!src.length) return [];
  type Cursor = { t: Track; gaps: Interval[]; g: number; pos: number; outerHigh: boolean; last: string };
  const cursors: Cursor[] = [];
  for (const t of ECHO_ORDER) {
    const open = openArc(t, days);
    if (open < ADVANCE / 2) continue;
    const [zLo, zHi] = echoZone(t);
    const anchors: Interval[] = [];
    for (const r of ledger.values()) for (const p of r.pieces) if (p.track === t.index) anchors.push([p.aLo, p.aHi]);
    const outerHigh = innerIsLow(t);
    const gaps = freeGaps(anchors, zLo, Math.min(zHi, open + ADVANCE / 2)); // ascending
    if (outerHigh) gaps.reverse(); // walk from the outer end inward
    if (gaps.length) cursors.push({ t, gaps, g: 0, pos: outerHigh ? gaps[0]![1] : gaps[0]![0], outerHigh, last: '' });
  }

  const out: EPiece[] = [];
  let total = anchorsShown;
  let live = cursors.slice();
  while (live.length && total < cap) {
    const next: Cursor[] = [];
    for (const k of live) {
      let placed = false;
      while (!placed && k.g < k.gaps.length) {
        const [lo, hi] = k.gaps[k.g]!;
        const room = k.outerHigh ? k.pos - lo : hi - k.pos;
        const slot = `${k.t.id}:${Math.round(k.pos)}`;
        let pick: { e: (typeof src)[number]; p: Unit; adv: number } | null = null;
        let fallback: { e: (typeof src)[number]; p: Unit; adv: number } | null = null;
        for (const e of [...src].sort((a, b) => h(`${ART_VERSION}:${slot}:${b.id}`) - h(`${ART_VERSION}:${slot}:${a.id}`))) {
          const order = (u: Unit[]) => u.sort((a, b) => h(`${slot}:${e.id}:${b.id}`) - h(`${slot}:${e.id}:${a.id}`));
          for (const p of [...order(e.ph.filter(u => u.id[0] === 'p')), ...order(e.ph.filter(u => u.id[0] === 'w'))]) {
            const adv = advIn(e.c, p.start, p.end);
            if (adv > room + 1e-6 || total + p.visible > cap) continue;
            if (p.text === k.last) { fallback ??= { e, p, adv }; continue; }
            pick = { e, p, adv };
            break;
          }
          if (pick) break;
        }
        pick ??= fallback;
        if (!pick) { k.g++; if (k.g < k.gaps.length) k.pos = k.outerHigh ? k.gaps[k.g]![1] : k.gaps[k.g]![0]; continue; }
        const aLo = k.outerHigh ? k.pos - pick.adv : k.pos;
        out.push({ entryId: pick.e.id, unit: pick.p.id, track: k.t.index, aLo, aHi: aLo + pick.adv, from: pick.p.start, to: pick.p.end, copyIndex: 0, slot });
        total += pick.p.visible;
        k.last = pick.p.text;
        k.pos = k.outerHigh ? aLo - GAP : aLo + pick.adv + GAP;
        placed = true;
      }
      if (placed) next.push(k);
    }
    live = next;
  }
  const count = new Map<string, number>();
  for (const p of [...out].sort((a, b) => a.track - b.track || b.aHi - a.aHi)) {
    const key = `${p.entryId}#${p.from}-${p.to}`;
    p.copyIndex = (count.get(key) ?? 0) + 1;
    count.set(key, p.copyIndex);
  }
  return out;
}

// ───────────────────────────── glyphs ─────────────────────────────

export type AGlyph = FlakeGlyph & {
  role: 'anchor' | 'echo';
  source: string; // real entryId (StaticGlyph.entryId = strand id, used only to seed correlated float)
  sourceStart: number; sourceEnd: number; // grapheme range of the strand in graphemes(body)
  copyIndex: number; // 0 = anchor
  strand: string;
};

function lay(out: AGlyph[], t: Track, aLo: number, aHi: number, c: Chars, from: number, to: number, base: Omit<AGlyph, keyof FlakeGlyph>, piece: number, keyOf: (gi: number) => string) {
  let a = aHi;
  for (let gi = from; gi < Math.min(to, c.length); gi++) {
    const g = c[gi]!;
    const adv = advanceOf(g.text);
    if (a - adv < aLo - 1e-6) break;
    const center = a - adv / 2;
    a -= adv;
    if (g.text === ' ') continue;
    const s = sAt(t, center);
    out.push({ key: keyOf(gi), entryId: base.strand, lane: t.index, graphemeIndex: gi, sourceOffset: g.offset, glyph: g.text, a: center,
      theta0: t.phase - center / t.arc, axisY: t.ly + s * t.vy, radius: t.radius, arc: t.arc, topMin: topAt(t, center), track: t.index, s, piece, ...base });
  }
}

export type FlakeState = {
  group: Group; days: number; entries: Entry[]; ledger: Ledger | null; echo: EPiece[];
  all: AGlyph[]; // every slotted glyph incl. reserved future anchor glyphs (never drawn before their height opens)
  active: AGlyph[]; // drawn
};

export function buildState(group: Group, entries: Entry[], prev?: Ledger): FlakeState {
  const days = distinctDays(entries);
  const top = revealTop(days);
  const shown = (g: AGlyph) => days > 0 && g.topMin >= top;
  if (group === 'G0') {
    const all = g0Build(entries, g0Allocate(entries)).map((g): AGlyph => ({ ...g, role: 'anchor', source: g.entryId, sourceStart: -1, sourceEnd: -1, copyIndex: 0, strand: g.entryId })); // G0: no range model
    const act = new Set(g0Active(all, days).map(g => g.key));
    return { group, days, entries, ledger: null, echo: [], all, active: all.filter(g => act.has(g.key)) };
  }
  const ledger = allocateAnchors(entries, prev);
  const all: AGlyph[] = [];
  for (const e of [...entries].sort(byWriting)) {
    const r = ledger.get(e.id);
    if (!r) continue;
    const c = graphemes(e.body);
    r.pieces.forEach((p, i) => lay(all, TRACKS[p.track]!, p.aLo, p.aHi, c, p.from, p.to,
      { role: 'anchor', source: e.id, sourceStart: r.range[0], sourceEnd: r.range[1], copyIndex: 0, strand: e.id }, i, gi => `${e.id}:${gi}`));
  }
  const anchorsShown = all.filter(shown).length;
  const echo = group === 'G2' ? placeEcho(entries, ledger, days, anchorsShown) : [];
  const bodies = new Map(entries.map(e => [e.id, graphemes(e.body)]));
  for (const p of echo) {
    const strand = `echo:${p.slot}`;
    lay(all, TRACKS[p.track]!, p.aLo, p.aHi, bodies.get(p.entryId)!, p.from, p.to,
      { role: 'echo', source: p.entryId, sourceStart: p.from, sourceEnd: p.to, copyIndex: p.copyIndex, strand }, 0, gi => `${strand}:${gi}`);
  }
  return { group, days, entries, ledger, echo, all, active: all.filter(shown) };
}

// ───────────────────────────── measurements (metrics.json / tests) ─────────────────────────────

/** World distance of a glyph's axis point from the flake centre. */
export const radiusOf = (g: AGlyph) => { const t = TRACKS[g.track]!; return Math.hypot(t.lx + g.s * t.vx - CX, t.ly + g.s * t.vy - CY); };

export function measure(st: FlakeState) {
  const f = newFrame();
  const top = revealTop(st.days);
  const echo = st.active.filter(g => g.role === 'echo');
  const anchors = st.active.length - echo.length;
  const anchorSlots = st.all.filter(g => g.role === 'anchor').length;
  const total = st.entries.reduce((n, e) => n + graphemes(e.body).filter(g => g.text !== ' ').length, 0);
  const perArm = [0, 1, 2, 3, 4, 5].map(a => st.active.filter(g => TRACKS[g.track]!.arm === a).length);
  const used = new Set(st.active.map(g => g.track));
  const units = new Set(st.echo.map(p => `${p.entryId}#${p.from}-${p.to}`));
  const r1 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    drawn: st.active.length, anchorsDrawn: anchors, echoDrawn: echo.length, reservedNotYetOpen: anchorSlots - anchors,
    unplacedSource: st.ledger ? [...st.ledger.values()].reduce((n, r) => n + r.unplaced, 0) : total - anchorSlots,
    sourceGlyphs: total, echoPerAnchor: anchors ? r1(echo.length / anchors) : null,
    echoPieces: st.echo.length, echoUnitsUsed: units.size, maxCopyIndex: Math.max(0, ...st.echo.map(p => p.copyIndex)),
    frontAt0deg: st.active.filter(g => projectFlake(g, ZERO, 0, top, f).cos >= CULL).length,
    axesUsed: used.size, armsUsed: [...used].filter(i => TRACKS[i]!.kind === 'arm').length, twigsUsed: [...used].filter(i => TRACKS[i]!.kind === 'twig').length,
    perArm, armBalanceMinOverMax: Math.max(...perArm) ? r1(Math.min(...perArm) / Math.max(...perArm)) : null,
    centreGlyphsR40: st.active.filter(g => radiusOf(g) < 40).length,
    revealTop: Math.round(top * 10) / 10,
  };
}
