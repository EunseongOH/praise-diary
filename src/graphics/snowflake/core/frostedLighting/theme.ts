/**
 * Gate 2H theme config — what a month's artwork is made of, kept apart from the engines that use it:
 *   Shape (geometry) · Typography (anchor / echo / strand text) · Motion (turn, exchange, float) · Lighting · Particles.
 * December = six-arm snowflake, cold winter light (white · silver · ice blue) as the main colour, a FEW pastel light points.
 * Shape and typography are owned by the existing engines (Gate 2E STROKES + 2F F2 core detail, 2F anchor ledger + echo,
 * 2G strands) — a new month needs its own shape tuning; changing this file alone does NOT create a new artwork.
 * Every number is a [연구안] starting value (decision 27 §4: HEX, counts, ratios, intensities are NOT decided).
 */
export type Look = {
  /** occlusion halo: radius in world units around each glyph, cut = how much of what lies behind it is removed (1 = all) */
  halo: { radius: number; cut: number };
  /** 'ink' = Gate 2F/2G tint (INK → white by depth) · 'cold' = theme lighting ramp + front glow + back softness */
  light: 'ink' | 'cold';
  pulses: number; // gain of the slow light rhythm on the arms / core (0 = off)
  particles: boolean; // small twinkling light points on the crystal
  beads: boolean; // tiny lights that run with the front-arrival wave of a strand (reacts to the exchange)
  reactive: boolean; // a strand arriving in front flashes a little brighter for that moment
  motion: 'R2' | 'R3'; // Gate 2G motion variant
  period: number; // one strand turn, seconds
};

export type MonthTheme = {
  id: string;
  background: string; // page backdrop (AGENTS.md 13: one uninterrupted dark canvas)
  shape: { engine: string; note: string };
  typography: { layers: 2 | 3; note: string };
  motion: { twist: number; note: string };
  lighting: {
    levels: number; // colour levels of the ramp (bitmaps are cached per level)
    ramp: [number, string][]; // light value 0 = back (cold, dim) … 1 = front (frost white)
    strand: { min: number; gamma: number }; // strand light = min + (1 − min) · frontness^gamma
    still: { base: number; perZ: number; min: number; max: number; dir: [number, number]; dirGain: number }; // non-strand glyphs
    frontGlow: { from: number; blur: number; color: string; flashBlur: number; flashColor: string };
    backSoft: { to: number; blur: number }; // light ≤ to → pre-blurred bitmap (world units)
    pulses: { armPeriod: number; radius: number; armAlpha: number; corePeriod: number; coreRadius: number; coreAlpha: number; color: string };
    reactive: { from: number; to: number }; // θ window (rad) before the front where an arriving strand flashes
  };
  particles: {
    sites: { core: number; tipShare: number; along: number };
    glyphsPerLight: number; // at most one light per this many drawn glyphs → lights never outnumber early-growth text
    cold: string[];
    pastel: string[];
    bulbShare: { core: number; tip: number; along: number }; // share of round "bulb" lights per site (rest = frost glints)
    pastelShare: number; // share of bulbs that are pastel (the only place pastel appears)
    size: { frost: [number, number]; bulb: [number, number] }; // glow radius, world units
    twinkle: { period: [number, number]; duty: [number, number] };
    alpha: number;
    beads: { lineShare: number; window: number; alpha: number; size: number; pastelShare: number };
  };
};

export const DECEMBER: MonthTheme = {
  id: 'december-snowflake-v0.1',
  background: '#0C1111',
  shape: { engine: 'Gate 2F F2 (Gate 2E STROKES + F2 core detail)', note: '여섯 갈래 결정 · 육각 코어 · 줄기/가지/바깥 육각 변 48줄' },
  typography: { layers: 3, note: '대표(anchor) = 2F 원장 그대로 · 반복(echo) = 2F 규칙 · 구절층 B/C = 다른 일기의 실제 구절(2G)' },
  motion: { twist: 0.8, note: '줄마다 자기 축을 도는 구절층(2G) · 팔마다 다른 위상 · 눈꽃 전체 회전 없음' },
  lighting: {
    levels: 12,
    ramp: [[0, '#4E6A82'], [0.35, '#7E9BB3'], [0.62, '#B3CADB'], [0.85, '#DCEAF4'], [1, '#F7FBFF']],
    strand: { min: 0.1, gamma: 1.6 },
    still: { base: 0.56, perZ: 0.035, min: 0.3, max: 0.72, dir: [-0.6, -0.8], dirGain: 0.06 },
    frontGlow: { from: 0.86, blur: 1.1, color: 'rgba(196,226,255,0.55)', flashBlur: 1.4, flashColor: 'rgba(214,236,255,0.6)' },
    backSoft: { to: 0.2, blur: 0.35 },
    pulses: { armPeriod: 9, radius: 15, armAlpha: 0.13, corePeriod: 13, coreRadius: 24, coreAlpha: 0.08, color: '228,242,255' },
    reactive: { from: -0.75, to: 0.12 },
  },
  particles: {
    sites: { core: 8, tipShare: 0.3, along: 12 },
    glyphsPerLight: 17,
    cold: ['#F4FAFF', '#DDEEFF', '#C8E2F5'],
    pastel: ['#CFE6FF', '#DCCFFF', '#FFD3E6', '#CDF3E2', '#FFF0C9'], // 옅은 하늘 · 라벤더 · 연핑크 · 민트 · 연샴페인
    bulbShare: { core: 0, tip: 0.6, along: 0.3 },
    pastelShare: 0.25,
    size: { frost: [1.6, 2.4], bulb: [2.0, 2.8] },
    twinkle: { period: [4, 9], duty: [0.22, 0.42] },
    alpha: 0.9,
    beads: { lineShare: 0.5, window: 0.16, alpha: 0.55, size: 1.6, pastelShare: 0.2 },
  },
};

export type HVariant = 'H0' | 'H1' | 'H2' | 'H3' | 'H4';
export const HVARIANTS: HVariant[] = ['H0', 'H1', 'H2', 'H3', 'H4'];
const SOFT = { radius: 0.8, cut: 0.55 };
/** H0 = Gate 2G R2 as rendered there (halo r 2.2, full cut, INK tint) · each next look adds one layer */
export const LOOKS: Record<HVariant, Look> = {
  H0: { halo: { radius: 2.2, cut: 1 }, light: 'ink', pulses: 0, particles: false, beads: false, reactive: false, motion: 'R2', period: 20 },
  H1: { halo: SOFT, light: 'ink', pulses: 0, particles: false, beads: false, reactive: false, motion: 'R2', period: 20 },
  H2: { halo: SOFT, light: 'cold', pulses: 1, particles: false, beads: false, reactive: false, motion: 'R2', period: 20 },
  H3: { halo: SOFT, light: 'cold', pulses: 1, particles: true, beads: false, reactive: false, motion: 'R2', period: 20 },
  H4: { halo: SOFT, light: 'cold', pulses: 1.3, particles: true, beads: true, reactive: true, motion: 'R3', period: 16 },
};
