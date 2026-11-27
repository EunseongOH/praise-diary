import type { MonthTheme } from '../data/types';
import { savedMessage } from './copy';

export type SavedKind = 'growth' | 'addition' | 'complete';

/** The narrative follows the snowflake's actual distinct entry dates, not a streak or entry count. */
export const SNOWFLAKE_DAY_COPY: Readonly<Record<number, string>> = {
  1: '작은 눈꽃이 피어나기 시작했어요.',
  2: '눈꽃에 새로운 글자가 더해졌어요.',
  3: '눈꽃이 조금씩 모습을 갖춰가요.',
  4: '남긴 칭찬이 눈꽃의 새 결이 되었어요.',
  5: '작은 칭찬들이 모여 눈꽃의 결을 만들어요.',
  6: '눈꽃이 조금 더 풍성해졌어요.',
  7: '차곡차곡 쌓인 다정함이 눈꽃에 스며들었어요.',
  8: '눈꽃의 무늬가 한층 또렷해졌어요.',
  9: '칭찬이 쌓여 눈꽃을 더 채웠어요.',
  10: '나에게 건넨 말들이 눈꽃을 더 빛내고 있어요.',
  11: '눈꽃에 새로운 결이 더해졌어요.',
  12: '눈꽃이 한층 깊은 모습을 갖췄어요.',
  13: '어느새 눈꽃에 다정한 마음이 가득해졌어요.',
  14: '눈꽃이 어느새 이만큼 피어났어요.',
};

export const SNOWFLAKE_COMPLETION_COPY = '차곡차곡 모은 다정함이 하나의 눈꽃이 되었어요.';

/** Post-goal captions intentionally avoid "complete", streaks, "today", and claims about a user's emotions. */
export const POST_GOAL_COPY = [
  '나에게 다정함 한 스푼을 더했어요.',
  '나를 아끼는 마음이 또 하나 쌓였어요.',
  '나에게 다정한 말을 하나 더 건넸어요.',
  '작지만 따뜻한 칭찬을 하나 더 남겼어요.',
  '나를 향한 다정함이 조금 더 깊어졌어요.',
  '마음에 작은 온기 하나를 보탰어요.',
  '나를 알아주는 말이 하나 더 늘었어요.',
  '나의 작은 노력을 한 번 더 알아봐 줬어요.',
  '다정한 마음을 하나 더 간직했어요.',
  '나에게 보내는 따뜻한 말이 하나 늘었어요.',
  '나를 다독이는 한마디를 남겼어요.',
  '나를 위한 다정한 기록이 하나 더 생겼어요.',
  '나를 아껴 주는 순간을 하나 더 모았어요.',
  '작은 다정함 하나가 더 쌓였어요.',
  '스스로에게 따뜻한 말을 하나 더 남겼어요.',
  '나의 좋은 점을 하나 더 알아봐 줬어요.',
] as const;

/** No RNG in render: a 16-item shuffled cycle. The counter advances only after a successful new save. */
export function postGoalCaption(counter: number): string {
  const safe = Number.isSafeInteger(counter) && counter >= 0 ? counter : 0;
  const len = POST_GOAL_COPY.length;
  const cycle = Math.floor(safe / len);
  return POST_GOAL_COPY[((safe % len) * 7 + cycle * 5) % len]!;
}

export function selectSavedCopy(args: {
  theme: MonthTheme | undefined;
  mode: SavedKind;
  beforeDays: number;
  afterDays: number;
  postGoalCounter: number;
  /** Explicit review-only override; production uses theme.targetDays (December remains null). */
  previewGoal?: number | null;
}): { text: string; nextCounter: number } {
  const { theme, mode, beforeDays, afterDays, postGoalCounter, previewGoal } = args;
  const counter = Number.isSafeInteger(postGoalCounter) && postGoalCounter >= 0 ? postGoalCounter : 0;
  if (!theme || theme.kind !== 'snowflake') return { text: savedMessage(theme, mode), nextCounter: counter };
  const target = previewGoal ?? theme.targetDays;
  const validTarget = target != null && Number.isInteger(target) && target > 0;
  if (validTarget && beforeDays >= target!) {
    return { text: postGoalCaption(counter), nextCounter: counter + 1 };
  }
  if (validTarget && beforeDays < target! && afterDays >= target!) {
    return { text: SNOWFLAKE_COMPLETION_COPY, nextCounter: counter };
  }
  if (mode === 'addition') return { text: '눈꽃에 칭찬이 하나 더 쌓였어요.', nextCounter: counter };
  if (afterDays >= 16) return { text: '눈꽃에 새로운 칭찬이 더해졌어요.', nextCounter: counter };
  if (afterDays === 15 && !validTarget) return { text: '남긴 칭찬이 눈꽃에 더해졌어요.', nextCounter: counter };
  return { text: SNOWFLAKE_DAY_COPY[afterDays] ?? '눈꽃에 칭찬이 더해졌어요.', nextCounter: counter };
}
