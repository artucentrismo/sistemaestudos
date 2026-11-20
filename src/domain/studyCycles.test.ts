import { describe, expect, it } from "vitest";
import { completeCycleNotebook, createStudyCycleProgress, getCycleProgressPercent, reconcileStudyCycle } from "./studyCycles";

describe("study cycles", () => {
  it("completes a pass after every active notebook is visited, regardless of visit duration", () => {
    let progress = createStudyCycleProgress("law", ["a", "b", "c", "d"]);
    for (const id of ["a", "b", "c"]) {
      expect(progress.notebookIds[progress.currentNotebookIndex]).toBe(id);
      progress = completeCycleNotebook(progress).progress;
    }
    const last = completeCycleNotebook(progress);
    expect(last.completedPass).toBe(true);
    expect(last.progress.completedPasses).toBe(1);
    expect(last.progress.visitedNotebookIds).toEqual([]);
    expect(last.progress.completedPassHistory?.[0].notebookIds).toEqual(["a","b","c","d"]);
    expect(last.nextNotebookId).toBe("a");
    expect(getCycleProgressPercent(last.progress)).toBe(0);
  });

  it("does not count a paused partial visit unless completion is explicitly recorded", () => {
    const progress = createStudyCycleProgress("law", ["a", "b"]);
    expect(progress.visitedNotebookIds).toEqual([]);
    expect(progress.completedPasses).toBe(0);
  });

  it("preserves visit history by permanent notebook ID when order changes", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), visitedNotebookIds: ["a"], currentNotebookIndex: 1 };
    const reconciled = reconcileStudyCycle(progress, "law", ["c", "a", "b"]);
    expect(reconciled.visitedNotebookIds).toEqual(["a"]);
    expect(reconciled.notebookIds[reconciled.currentNotebookIndex]).toBe("b");
  });

  it("removes deleted notebooks from the current pass and preserves remaining visits", () => {
    const progress = { ...createStudyCycleProgress("law", ["a", "b", "c"]), visitedNotebookIds: ["a", "c"], currentNotebookIndex: 1 };
    const reconciled = reconcileStudyCycle(progress, "law", ["a", "b"]);
    expect(reconciled.visitedNotebookIds).toEqual(["a"]);
    const last = completeCycleNotebook(reconciled);
    expect(last.completedPass).toBe(true);
  });

  it("migrates an older index-only cycle into stable visited notebook IDs", () => {
    const legacy = { disciplineId: "law", notebookIds: ["a", "b", "c"], currentNotebookIndex: 2, completedPasses: 1, updatedAt: "2026-11-18T10:00:00.000Z" };
    const next = reconcileStudyCycle(legacy, "law", ["a", "b", "c"]);
    expect(next.visitedNotebookIds).toEqual(["a", "b"]);
  });

  it("starts a new pass after the final eligible notebook", () => {
    let progress = createStudyCycleProgress("law", ["a"]);
    const step = completeCycleNotebook(progress);
    expect(step.completedPass).toBe(true);
    expect(step.progress.completedPasses).toBe(1);
    expect(step.nextNotebookId).toBe("a");
  });
  it("rotates continuously when a pass uses fewer notebooks than the discipline has", () => {
    let progress = createStudyCycleProgress("math", ["a", "b", "c", "d", "e"]);
    for (const expected of ["a", "b", "c", "d"]) {
      expect(progress.notebookIds[progress.currentNotebookIndex]).toBe(expected);
      progress = completeCycleNotebook(progress, undefined, 4).progress;
    }
    expect(progress.completedPasses).toBe(1);
    expect(progress.notebookIds[progress.currentNotebookIndex]).toBe("e");
    for (const expected of ["e", "a", "b", "c"]) {
      expect(progress.notebookIds[progress.currentNotebookIndex]).toBe(expected);
      progress = completeCycleNotebook(progress, undefined, 4).progress;
    }
    expect(progress.completedPasses).toBe(2);
    expect(progress.notebookIds[progress.currentNotebookIndex]).toBe("d");
  });

  it("caps a configured pass to the number of available notebooks", () => {
    let progress = createStudyCycleProgress("law", ["a", "b"]);
    progress = completeCycleNotebook(progress, undefined, 4).progress;
    expect(progress.completedPasses).toBe(0);
    const last = completeCycleNotebook(progress, undefined, 4);
    expect(last.completedPass).toBe(true);
    expect(last.progress.completedPasses).toBe(1);
    expect(last.nextNotebookId).toBe("a");
  });

});