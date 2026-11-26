/** 내부 범주는 균형 추첨 전용. 화면에 category/분류명을 절대 표시하지 않는다. */
const PROMPTS = [
  { category: 'effort', today: '오늘 끝까지 해보려고 노력한 일은 무엇인가요?', yesterday: '어제 끝까지 해보려고 노력한 일은 무엇이었나요?' },
  { category: 'care', today: '오늘 나를 위해 해준 작은 일은 무엇인가요?', yesterday: '어제 나를 위해 해준 작은 일은 무엇이었나요?' },
  { category: 'everyday', today: '오늘 작지만 잘 해냈다고 느낀 순간은 언제였나요?', yesterday: '어제 작지만 잘 해냈다고 느낀 순간은 언제였나요?' },
  { category: 'courage', today: '오늘 망설이다가 용기 내어 해본 일이 있나요?', yesterday: '어제 망설이다가 용기 내어 해본 일이 있나요?' },
  { category: 'relationship', today: '오늘 누군가에게 건넨 다정한 말이 있나요?', yesterday: '어제 누군가에게 건넨 다정한 말이 있나요?' },
  { category: 'recovery', today: '오늘 힘들어도 나를 잘 지킨 순간은 언제였나요?', yesterday: '어제 힘들어도 나를 잘 지킨 순간은 언제였나요?' },
  { category: 'gratitude', today: '오늘 고맙다고 느낀 나의 모습은 무엇인가요?', yesterday: '어제 고맙다고 느낀 나의 모습은 무엇이었나요?' },
  { category: 'achievement', today: '오늘 하나라도 해낸 일이 있다면 무엇인가요?', yesterday: '어제 하나라도 해낸 일이 있다면 무엇이었나요?' },
];

export type Prompt = (typeof PROMPTS)[number];

export function pickPrompts(previous: Prompt[] = []): Prompt[] {
  const sorted = [...PROMPTS];
  for (let i=sorted.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [sorted[i],sorted[j]]=[sorted[j]!,sorted[i]!]; }
  const filtered = sorted.filter((p) => !previous.some((old) => old.category === p.category));
  const choices = filtered.length >= 2 ? filtered : sorted;
  const first = choices[0];
  const second = choices.find((p) => p.category !== first?.category);
  return first && second ? [first, second] : sorted.slice(0, 2);
}
