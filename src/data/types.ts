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
  /** Saved message rotation progress (not the number of days); retained after entry deletion. */
  postGoalCopyCounter?: number;
  boundaryHour: number;
  reducedMotion: boolean;
  ideas: GraphicIdea[];
};

export type MonthTheme = {
  month: MonthId;
  title: string;
  /** Open set of future artwork types; the renderer is selected by artworkKey, not this display category. */
  kind: 'snowflake' | 'sheep' | (string & {});
  /** Immutable versioned renderer/preview registration. Undefined only for legacy fixture compatibility. */
  artworkKey?: string;
  targetDays: number | null;
};
