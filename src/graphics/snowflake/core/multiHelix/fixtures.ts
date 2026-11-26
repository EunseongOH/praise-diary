/** App build stub (see ../../studyFixtures.ts): research fixtures are not bundled. Same export, never called by the app. */
import { studyEntries, type StudyDataset } from '../../studyFixtures';

export function multiHelixEntries(days: number, extra: number, dataset: StudyDataset) {
  return studyEntries(days, extra > 0, dataset);
}
