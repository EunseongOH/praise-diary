/**
 * Gate 3E.1b / 3E.2 — December month config (dev-only). Everything month-specific lives here (colours, reward amounts,
 * motion character) so another month can swap this file; the engines (smoothReveal / snowglobe) only read it.
 * Every number is a [연구안] — not approved art.
 */
export const ART_VERSION = 'snowflake-growth-reward-v0.1';

export type Growth = 'T2' | 'G1' | 'G2';
export const GROWTHS: Growth[] = ['T2', 'G1', 'G2'];
export type Reward = 'off' | 'gentle' | 'balanced';
export const REWARDS: Reward[] = ['off', 'gentle', 'balanced'];

/** growth variants. T2 = the Gate 3E.1 schedule itself (imported, reference). G1 / G2 = smooth motif-first bloom. */
export const GROWTH: Record<'G1' | 'G2', {
  flow: number; // share of a glyph's alpha that rises at a constant rate over the whole day window (no stop at day boundaries)
  envelope: number; // share given by its motif envelope (structure first) — the rest is the glyph fill wave
  envStagger: number; envLen: number; // motif envelope starts staggered over this share of the day window, each this long
  fillDelay: number; fillSpread: number; fillLen: number; // glyph fill: after the envelope start, wave along the motif, each glyph's fade
  swapFrom: number; swapSpread: number; swapLen: number; // echo swaps: start window (far from today's new structure = earlier), each fade
  removeFrom: number; removeLen: number;
}> = {
  G1: { flow: 0.4, envelope: 0.25, envStagger: 0.3, envLen: 0.3, fillDelay: 0.1, fillSpread: 0.25, fillLen: 0.35, swapFrom: 0.08, swapSpread: 0.62, swapLen: 0.3, removeFrom: 0.45, removeLen: 0.5 },
  G2: { flow: 0.25, envelope: 0.45, envStagger: 0.22, envLen: 0.38, fillDelay: 0.16, fillSpread: 0.24, fillLen: 0.38, swapFrom: 0.1, swapSpread: 0.6, swapLen: 0.3, removeFrom: 0.45, removeLen: 0.5 },
};
/** day-window tempo (relative length per stage k = 2…15): a little slower out of the seed and into the final crystal */
export const TEMPO = [0, 0, 1.3, 1.2, 1.1, 1, 1, 1, 1, 1, 1, 1, 1, 1.05, 1.15, 1.25];
/** structure order inside a day: the envelope of a motif type opens before the next type */
export const MOTIF_RANK: Record<string, number> = { core_hex: 0, micro_detail: 0, core_spoke: 1, arm_root: 2, primary_spine: 3, branch_inner: 4, branch_outer: 5, tip_plate: 6 };

/** snowglobe reward amounts (spec: frost 65–75 %, text 25–35 %; text 1–2 real graphemes; sparkle 80 % particles / 20 % body) */
export const REWARD: Record<'gentle' | 'balanced', {
  text: number; frost: number; sparkleRate: number; // totals over the reward / sparkles per second at full rate
  textAlpha: number; frostAlpha: number; swirl: number; // peak alpha, swirl angular speed (rad/s at the start, decays)
}> = {
  gentle: { text: 10, frost: 24, sparkleRate: 5, textAlpha: 0.5, frostAlpha: 0.75, swirl: 0.32 },
  balanced: { text: 14, frost: 30, sparkleRate: 8, textAlpha: 0.6, frostAlpha: 0.9, swirl: 0.42 },
};
export const PARTICLE = {
  life: [1.6, 2.4] as const, // s
  emitSpan: 1.3, // births spread over the first 1.3 s of the reward (never all at once)
  fadeIn: 0.3, fadeOut: 0.7,
  emitterShare: { tip: 0.45, joint: 0.4, rim: 0.15 }, // frost; text = arm tips 50 % / outer branch ends 50 %
  outward: [8, 22] as const, // world units of gentle radial drift (into the open globe, off the arms)
  sink: 5, // world units / s² of slow settling (snowglobe)
  wobble: [1.2, 2.6] as const, wobbleHz: [0.5, 0.9] as const,
  swirlDecay: 1.6, // s — the swirl of a lightly shaken globe slows down
  textSwirl: 0.4, // text flakes turn less than frost (they stay in the gap between two arms instead of crossing one)
  textSide: 7, // world units a text flake steps past the end of its arm / branch before it starts to drift
  frostSize: [0.8, 1.9] as const, textScale: [0.5, 0.62] as const, // text vs body glyph size
  sparkle: { dur: [0.12, 0.22] as const, bodyShare: 0.2, size: [2.4, 3.6] as const },
};
export const COLORS = {
  frost: ['#F4FAFF', '#E2F0FF', '#D6EAFB', '#EAF6FF'], // white / ice blue only
  text: ['#EAF3FB', '#DCEBF7'],
  sparkle: { core: 'rgba(255,255,255,1)', mid: 'rgba(225,240,255,0.55)', ray: 'rgba(236,246,255,0.75)', edge: 'rgba(210,232,255,0)' },
};
