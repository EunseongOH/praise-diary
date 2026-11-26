export type MonthId = `${number}-${number}`;

export type DiaryEntry = {
  id: string;
  entryDate: string; // YYYY-MM-DD, 기록이 귀속되는 날짜
  createdAt: string; // 실제 저장 시각
  title?: string;
  body: string;
  referencePrompt?: string; // selected question snapshot, independent from original body
};

export type DiaryReflection = {
  id: string;
  entryId: string;
  body: string;
  reflectionDate: string;
  createdAt: string;
  updatedAt: string;
};

export type GraphicIdea = { id: string; month: MonthId; text: string; createdAt: string };

export type PrototypeState = {
  entries: DiaryEntry[];
  reflections: DiaryReflection[];
  letterDrawUnlockedAt: string | null;
  boundaryHour: number;
  reducedMotion: boolean;
  ideas: GraphicIdea[];
};

export type MonthTheme = {
  month: MonthId;
  title: string;
  kind: 'snowflake' | 'sheep';
  targetDays: number | null;
};
