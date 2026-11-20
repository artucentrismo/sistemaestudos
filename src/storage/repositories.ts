import type { StudyBlock } from "../domain/studyBlocks";

import {
  createRecordId,
  createTimestamps,
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  type BaseRecord,
  type StoreName,
} from "./database";

export type EntityInput = Record<string, unknown> & { id?: string };

export function createRepository<T extends BaseRecord>(storeName: Exclude<StoreName, "settings">) {
  return {
    async list(): Promise<T[]> {
      return (await getAllRecords(storeName)) as T[];
    },
    async get(id: string): Promise<T | undefined> {
      return (await getRecord(storeName, id)) as T | undefined;
    },
    async save(input: EntityInput): Promise<T> {
      const existing = input.id ? await getRecord(storeName, input.id) as T | undefined : undefined;
      const now = new Date().toISOString();
      const record = {
        ...input,
        id: input.id ?? createRecordId(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      } as T;
      await putRecord(storeName, record);
      return record;
    },
    async remove(id: string): Promise<void> {
      await deleteRecord(storeName, id);
    },
  };
}

export function createSettingRepository<T = unknown>() {
  return {
    async get(key: string): Promise<T | undefined> {
      const record = await getRecord("settings", key);
      return record?.value as T | undefined;
    },
    async set(key: string, value: T): Promise<void> {
      await putRecord("settings", { key, value, updatedAt: new Date().toISOString() });
    },
  };
}

export const disciplineRepository = createRepository("disciplines");
export const subjectRepository = createRepository("subjects");
export const subjectDependencyRepository = createRepository("subjectDependencies");
export const notebookRepository = createRepository("notebooks");
export const notebookSubjectRepository = createRepository("notebookSubjects");
export const studyPlanRepository = createRepository("studyPlans");
export const studyPlanItemRepository = createRepository("studyPlanItems");
export const sessionRepository = createRepository("sessions");
export const sessionSegmentRepository = createRepository("sessionSegments");
export const studyBlockRepository = createRepository<StudyBlock>("studyBlocks");
export const flashcardRepository = createRepository("flashcards");
export const flashcardReviewRepository = createRepository("flashcardReviews");
export const essayRepository = createRepository("essays");
export const settingsRepository = createSettingRepository();

export { createRecordId, createTimestamps };
