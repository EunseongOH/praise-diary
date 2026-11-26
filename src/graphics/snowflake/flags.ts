/**
 * Review feature flags (Vite build-time env, statically replaced → with the flag OFF the whole snowflake engine is
 * dead code and not in the bundle). Production default: OFF. Set them in a local `.env.local` (never committed) or via
 * `node scripts/snowflake-review.mjs`.
 *   VITE_SNOWFLAKE_ARTWORK=1              December snowflake renders in ArtworkSlot (home / saved / collection / detail)
 *   VITE_SNOWFLAKE_COMPLETION_REPLAY=1    review only: the 15-stage completion replay + snowglobe reward also plays when a
 *                                         save crosses the RESEARCH visual stage (14 → 15 distinct days) although the
 *                                         product target of 2026-12 is still undecided (targetDays = null); also enables
 *                                         the `?snowflakeDays=N` fake-data scenario and test hooks
 */
export const SNOWFLAKE_ARTWORK = import.meta.env.VITE_SNOWFLAKE_ARTWORK === '1';
export const SNOWFLAKE_REVIEW = import.meta.env.VITE_SNOWFLAKE_COMPLETION_REPLAY === '1';
/** research visual stage count (Gate 3B R3 15 stages) — NOT a business target, never shown to the user */
export const VISUAL_STAGE_DAYS = 15;
