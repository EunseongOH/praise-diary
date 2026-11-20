/**
 * Deterministic, theme-authored glyph paths.
 * A glyph follows the tangent of its own piece of the illustration, rather
 * than receiving an arbitrary x/y and a universal random wobble.
 *
 * No synthetic affirmations: every painted character is sampled from the
 * person's own diary body. Repetition is visual texture, not verbatim prose.
 * Never use these glyph layers in a public share export without explicit consent.
 */
export type GlyphSlot = {
  x: number;
  y: number;
  angleJitter: number;
  size: number;
  opacity: number;
  index: number;
};
export type GlyphCluster = {
  key: string;
  x: number;
  y: number;
  angle: number;
  swayDegrees: number;
  periodSeconds: number;
  phaseSeconds: number;
  slots: GlyphSlot[];
};

const CENTER_X = 170;
const CENTER_Y = 168;
const RAD = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const fract = (v: number) => v - Math.floor(v);
const hash = (a: number, b: number) => fract(Math.sin((a + 1) * 127.1 + (b + 1) * 311.7) * 43758.5453);

/** One slot is one possible letter position. Local x runs along a twig. */
function makeSlots(length: number, count: number, key: number): GlyphSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const t = (index + 0.5) / count;
    const small = hash(key, index * 13);
    const offset = (hash(key * 7, index * 9) - 0.5) * 1.25;
    return {
      x: length * t,
      y: offset,
      angleJitter: (hash(key * 5, index) - 0.5) * 5,
      size: 5.9 + small * 1.6,
      opacity: 0.52 + 0.28 * hash(key * 3, index * 11),
      index: key * 100 + index,
    };
  });
}

/**
 * Six snowflake spines, each with three pairs of mirrored ice twigs.
 * Spine and twig heading are also the intended text orientation.
 * The whole shape is geometrically symmetrical; the letters have tiny,
 * seeded differences so it reads as delicate type rather than a type grid.
 */
export function makeSnowflakeClusters(): GlyphCluster[] {
  const groups: GlyphCluster[] = [];
  for (let arm = 0; arm < 6; arm++) {
    const angle = -90 + arm * 60;
    const rad = angle * RAD;
    groups.push({
      key: `snow-spine-${arm}`,
      x: CENTER_X,
      y: CENTER_Y,
      angle,
      swayDegrees: 0.32 + arm * 0.045,
      periodSeconds: 8.4 + (arm % 3) * 0.7,
      phaseSeconds: arm * 0.9,
      slots: makeSlots(113, 14, arm + 1).map(slot => ({...slot, x: slot.x + 8})),
    });
    for (let level = 0; level < 3; level++) {
      const at = ([41, 66, 88] as const)[level] ?? 88;
      const length = ([28, 24, 19] as const)[level] ?? 19;
      for (const side of [-1, 1]) {
        const local = 53 * side;
        groups.push({
          key: `snow-twig-${arm}-${level}-${side}`,
          x: CENTER_X + Math.cos(rad) * at,
          y: CENTER_Y + Math.sin(rad) * at,
          angle: angle + local,
          swayDegrees: 0.85 + 0.23 * level,
          periodSeconds: 5.7 + 0.42 * ((arm + level * 2 + (side === 1 ? 1 : 0)) % 5),
          phaseSeconds: arm * 0.37 + level * 0.66 + (side === 1 ? 0.52 : 0),
          slots: makeSlots(length, 3, 10 + arm * 9 + level * 2 + (side === 1 ? 1 : 0)),
        });
      }
    }
  }
  return groups;
}

/**
 * Use a stable low-discrepancy order. When another diary is written on the
 * same day, new letters fill more slots without reshuffling old positions.
 * Original diary data may be encrypted server-side; only the authenticated
 * client's approved text should be supplied to this function.
 */
export function selectGlyphSlots(groups: GlyphCluster[], letterCount: number): Set<number> {
  const indices = groups.flatMap(group => group.slots.map(slot => slot.index));
  const amount = Math.min(indices.length, Math.max(0, letterCount > 0 ? 52 + letterCount * 9 : 0));
  // Deterministic permutation independent of text and growth phase.
  indices.sort((a, b) => hash(a, 108) - hash(b, 108));
  return new Set(indices.slice(0, amount));
}

export function extractDiaryGlyphs(source: string): string[] {
  return Array.from(source).filter(glyph => /[가-힣A-Za-z0-9]/.test(glyph));
}

/** Stable per-slot selection; never inserts made-up words. */
export function glyphForSlot(chars: string[], slotIndex: number): string {
  if (!chars.length) return '';
  return chars[Math.floor(hash(slotIndex, 23) * chars.length) % chars.length] ?? '';
}

/**
 * Preview-only ink density calibration, detached from the monthly target.
 * Production growth height is ALWAYS derived separately from writtenDays.
 */
export function visibleInkDensity(chars: string[], letterCount: number): number {
  return chars.length ? clamp01(0.3 + letterCount * 0.047) : 0;
}

export const ARTWORK_STUDY_NOTES = {
  spineOrientation: 'radial path tangent',
  twigOrientation: 'local twig tangent, symmetric 53° from the parent arm',
  motion: 'independent slow bending of each twig around its root, not random per-letter jitter',
  motionLimit: 'spines below 0.6°, twigs below 1.4°',
  emptySpace: 'no unrevealed upper outline',
} as const;
