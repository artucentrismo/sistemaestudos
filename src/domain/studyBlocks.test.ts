import { describe, expect, it } from "vitest";
import {
  STUDY_BLOCK_SECONDS,
  addStudyTime,
  canAdvanceToNextNotebook,
  getNextNotebookId,
  getPlannedBlockCount,
  getStudyBlockProgress,
  pauseStudyBlock,
  resumeStudyBlock,
  type StudyBlock,
} from "./studyBlocks";

const block: StudyBlock = {
  id: "block-1",
  createdAt: "2026-11-18T10:00:00.000Z",
  disciplineId: "constitutional",
  notebookId: "notebook-03",
  elapsedSeconds: 0,
  lastQuestionNumber: 27,
  status: "in_progress",
  startedAt: "2026-11-18T10:00:00.000Z",
  updatedAt: "2026-11-18T10:00:00.000Z",
};

describe("bloco pedagógico de 15 minutos", () => {
  it("preserva 9 minutos ao pausar e retoma com 6 minutos restantes", () => {
    const partial = addStudyTime(block, 9 * 60);
    const paused = pauseStudyBlock(partial);
    const resumed = resumeStudyBlock(paused);

    expect(paused.status).toBe("paused");
    expect(resumed.elapsedSeconds).toBe(9 * 60);
    expect(getStudyBlockProgress(resumed).remainingSeconds).toBe(6 * 60);
    expect(resumed.notebookId).toBe("notebook-03");
    expect(resumed.lastQuestionNumber).toBe(27);
    expect(canAdvanceToNextNotebook(resumed)).toBe(false);
  });

  it("só conclui o bloco do caderno ao acumular 15 minutos", () => {
    const partial = addStudyTime(block, 9 * 60);
    const resumed = resumeStudyBlock(pauseStudyBlock(partial));
    const completed = addStudyTime(resumed, 6 * 60);

    expect(completed.elapsedSeconds).toBe(STUDY_BLOCK_SECONDS);
    expect(completed.status).toBe("completed");
    expect(canAdvanceToNextNotebook(completed)).toBe(true);
  });

  it("supports a 15-second accelerated timer only when explicitly configured", () => {
    const progress = getStudyBlockProgress({ elapsedSeconds: 9 }, 15);
    expect(progress.remainingSeconds).toBe(6);
    expect(progress.completionPercent).toBe(60);
  });

  it("não permite acumular mais de 15 minutos no mesmo bloco", () => {
    const completed = addStudyTime(block, 20 * 60);
    expect(completed.elapsedSeconds).toBe(STUDY_BLOCK_SECONDS);
  });

  it("não altera blocos já concluídos", () => {
    const completed = addStudyTime(block, STUDY_BLOCK_SECONDS);
    expect(addStudyTime(completed, 60)).toEqual(completed);
  });

  it("calcula blocos planejados a partir do tempo da disciplina", () => {
    expect(getPlannedBlockCount(30)).toBe(2);
    expect(getPlannedBlockCount(60)).toBe(4);
    expect(getPlannedBlockCount(90)).toBe(6);
    expect(getPlannedBlockCount(14)).toBe(0);
  });

  it("faz rotação circular entre cadernos", () => {
    expect(getNextNotebookId(["01", "02", "03", "04"], "03")).toBe("04");
    expect(getNextNotebookId(["01", "02", "03", "04"], "04")).toBe("01");
    expect(getNextNotebookId(["01"], "01")).toBeUndefined();
  });
});
