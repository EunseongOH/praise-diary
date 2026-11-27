import type { DiaryEntry } from './types';

/** Fictional praise diaries for the December artwork introduction ONLY.
 * Never place these in the user's state, archive, diary count, or analytics.
 * The production snowflake engine uses the same 15 distinct dates and actual diary bodies.
 */
const PREVIEW_BODIES = [
  '해야 할 일이 많아 마음이 조급했지만, 하나씩 적어 두고 차근차근 시작했다. 서두르지 않고 첫걸음을 뗀 나를 칭찬한다.',
  '발표 전에 손이 조금 떨렸다. 그래도 준비한 이야기를 끝까지 마쳤다. 부족했던 부분만 생각하지 않고 해낸 순간도 기억해 주고 싶다.',
  '피곤한데도 무조건 참고 버티지 않았다. 일찍 씻고 누워 충분히 쉬었다. 내 몸의 신호를 알아차린 것도 잘한 일이다.',
  '오랜만에 친구에게 먼저 연락했다. 별다른 이야기는 하지 않았지만 서로의 안부를 묻는 시간이 따뜻했다.',
  '작은 실수를 했다. 예전 같았으면 오래 자책했겠지만 이번에는 잘못된 부분을 고치고 다시 시작했다.',
  '해야 할 일을 모두 끝내지는 못했다. 그래도 가장 중요한 한 가지를 마쳤다. 오늘 할 수 있었던 만큼 해낸 나를 인정해 준다.',
  '망설이다가 모르는 것을 질문했다. 괜히 부끄러워하지 않고 도움을 청한 내 모습이 조금 대견했다.',
  '바쁜 하루였지만 좋아하는 노래를 들으며 잠깐 산책했다. 아무것도 하지 않는 시간도 나에게 필요하다는 걸 기억했다.',
  '의견이 다른 사람의 이야기를 끝까지 들었다. 내 생각을 지키면서도 상대를 존중하려고 노력한 점을 칭찬하고 싶다.',
  '미뤄 두었던 서랍을 정리했다. 거창한 변화는 아니지만 오래 신경 쓰이던 일을 마치고 나니 마음이 한결 가벼워졌다.',
  '뜻대로 되지 않는 일이 있었다. 속상한 마음을 억지로 지우지 않고 충분히 느꼈다. 그 뒤에 다시 할 수 있는 일을 찾아봤다.',
  '누군가의 수고에 고맙다고 이야기했다. 평소에는 지나쳤을 작은 친절을 알아차리고 말로 전한 하루였다.',
  '오늘은 조금 느리게 움직였다. 다른 사람의 속도와 비교하기보다 나에게 맞는 속도를 선택했다.',
  '어려웠던 문제를 끝까지 붙잡고 고민했다. 바로 답을 찾지는 못했어도 어제보다 조금 더 이해하게 되었다. 포기하지 않은 나에게 고맙다.',
  '돌이켜 보면 대단한 하루만 있었던 것은 아니다. 쉬고, 웃고, 다시 시작하고, 때로는 용기 낸 순간들이 있었다. 그 모든 날을 지나온 나를 칭찬한다.',
] as const;

export const DECEMBER_PREVIEW_ENTRIES: DiaryEntry[] = PREVIEW_BODIES.map((body, i) => {
  const date = '2026-12-' + String(i + 1).padStart(2, '0');
  return { id: 'brand-preview-dec-' + (i + 1), entryDate: date, createdAt: date + 'T12:00:00+09:00', body };
});
export const DECEMBER_PREVIEW_DAYS = PREVIEW_BODIES.length;
