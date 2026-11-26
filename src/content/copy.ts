import type { MonthTheme } from '../data/types';

/** 기능 명세 v1.6의 사용자용 카피를 한곳에서 관리한다. */
export const COPY = {
  appName: '칭찬일기',
  tabs: { home: '홈', rediscover: '꺼내보기', collection: '도감' },
  home: {
    newEntry: '오늘의 칭찬 남기기',
    anotherEntry: '칭찬 하나 더 남기기',
    myEntries: '내가 남긴 칭찬 보기',
    noEntries: '오늘의 나에게 남기고 싶은 칭찬이 있나요?',
  },
  write: {
    title: '칭찬 남기기', today: '오늘', yesterday: '어제',
    promptHeading: '무엇을 칭찬할지 고민된다면',
    shuffle: '다른 질문 보기', titleOptional: '제목도 붙이기 (선택)',
    bodyHint: '오늘의 나에게 칭찬 한마디를 남겨보세요.',
    save: '칭찬 남기기', edit: '수정 완료',
    changeDay: (date: string) => `${date}의 일기로 기록돼요.`,
  },
  rediscover: {
    locked: '나에게 남겼던 칭찬 중 하나를 되새겨볼 수 있는 공간이에요.\n남겨진 칭찬이 많아지면 볼 수 있어요.',
    lockedCta: '칭찬일기 남기러 가기',
    prompt: '예전의 내가 남긴 칭찬을 꺼내볼까요?',
    draw: '칭찬 하나 꺼내보기', another: '다른 칭찬 꺼내기',
    empty: '지금은 꺼내볼 칭찬이 없어요.',
  },
  collection: {
    title: '그래픽 도감', subtitle: '내가 남긴 칭찬들이 자란 모습',
    locked: '아직 공개되지 않았어요.',
    suggest: '이런 그래픽은 어때요? 의견 남기기',
    monthEntries: '이달의 칭찬 보기',
  },
  settings: {
    title: '설정', boundary: '하루가 바뀌는 시간',
    boundaryHelp: '늦게 잠드는 편이라면 하루가 끝나는 시간을 늦출 수 있어요.',
    boundarySaved: '앞으로 쓰는 일기부터 적용돼요. 이미 남긴 기록의 날짜는 그대로예요.',
    reduceMotion: '그래픽 움직임 줄이기',
    notification: '칭찬일기 알림', notificationNotReady: '준비 중이에요',
  },
  notification: {
    heading: '하루를 돌아볼 시간을 정해둘까요?',
    description: '원하는 시간에 칭찬일기를 떠올릴 수 있도록 알려드려요. 이미 칭찬을 남긴 날에는 보내지 않아요.',
    enable: '알림 시간 정하기', defer: '나중에',
    notEnabled: '알림은 켜지지 않았어요.',
  },
  deletion: {
    all: '모든 칭찬일기 삭제',
    typePhrase: '모든 기록 삭제',
    impact: '작성한 모든 칭찬일기와 그 글자로 만든 월별 그래픽이 사라져요. 삭제한 기록은 되돌릴 수 없어요.',
    lastStep: '정말 모두 삭제할까요?',
    keep: '취소', confirm: '삭제하기',
  },
} as const;

export function savedMessage(theme: MonthTheme | undefined, mode: 'growth' | 'addition' | 'complete') {
  if (!theme) return '칭찬을 남겼어요.';
  const snow = theme.kind === 'snowflake';
  if (mode === 'complete') return snow ? '12월의 눈꽃이 활짝 피어났어요!' : '붉은 양과 해가 완성됐어요!';
  if (mode === 'addition') return snow ? '눈꽃에 칭찬이 하나 더 쌓였어요.' : '붉은 양에게 칭찬이 하나 더 쌓였어요.';
  return snow ? '눈꽃이 조금 더 피어났어요.' : '붉은 양이 조금 더 자랐어요.';
}

export function deleteImpact(theme: MonthTheme | undefined, lastOnDate: boolean): string {
  if (!lastOnDate) return '이 일기를 삭제하면 그래픽에서 해당 글자가 사라져요.';
  if (theme?.kind === 'snowflake') return '12월의 눈꽃이 조금 녹아요.';
  if (theme?.kind === 'sheep') return '1월의 붉은 양이 조금 작아져요.';
  return '이 날짜의 작성일 수가 줄어들어요.';
}
