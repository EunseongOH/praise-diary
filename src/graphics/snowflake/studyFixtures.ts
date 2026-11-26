/**
 * App build: the research study fixtures (spec 19 fake diaries) are NOT part of the service. The ported engine only
 * references them from dataset helper functions that the app never calls; this stub keeps the same export names so the
 * engine files stay byte-for-byte equal to the research sources, and fails loudly if anything ever calls it.
 */
export type StudyDataset = 'base' | 'short' | 'long' | 'mixed';
export type StudyEntry = { id: string; entryDate: string; createdAt: string; body: string };
export function studyEntries(_days: number, _sameDayExtra: boolean, _dataset: StudyDataset): StudyEntry[] {
  throw new Error('research fixtures are not bundled with the app');
}
