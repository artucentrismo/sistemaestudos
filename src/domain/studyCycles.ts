export type StudyCycleProgress = {
  disciplineId: string;
  notebookIds: string[];
  currentNotebookIndex: number;
  /** IDs already visited during the current pass; position is never used as identity. */
  visitedNotebookIds?: string[];
  passStartedAt?: string;
  completedPassHistory?: Array<{ number: number; startedAt: string; completedAt: string; notebookIds: string[] }>;
  completedPasses: number;
  updatedAt: string;
};

export type CycleStep = {
  progress: StudyCycleProgress;
  completedPass: boolean;
  nextNotebookId?: string;
  progressPercent: number;
};

export function createStudyCycleProgress(
  disciplineId: string,
  notebookIds: string[],
  updatedAt = new Date().toISOString(),
): StudyCycleProgress {
  return {
    disciplineId,
    notebookIds: [...notebookIds],
    currentNotebookIndex: 0,
    visitedNotebookIds: [],
    passStartedAt: updatedAt,
    completedPassHistory: [],
    completedPasses: 0,
    updatedAt,
  };
}

export function reconcileStudyCycle(
  progress: StudyCycleProgress | undefined,
  disciplineId: string,
  notebookIds: string[],
  updatedAt = new Date().toISOString(),
): StudyCycleProgress {
  const ordered = [...notebookIds];
  if (!progress || progress.disciplineId !== disciplineId) {
    return createStudyCycleProgress(disciplineId, ordered, updatedAt);
  }
  const currentId = progress.notebookIds[progress.currentNotebookIndex];
  const currentIndex = currentId ? ordered.indexOf(currentId) : -1;
  const legacyVisited = Array.isArray(progress.visitedNotebookIds) ? progress.visitedNotebookIds : progress.notebookIds.slice(0, Math.max(0, progress.currentNotebookIndex));
  const visitedNotebookIds = legacyVisited.filter(id => ordered.includes(id));
  const nextIndex = currentIndex >= 0
    ? currentIndex
    : ordered.findIndex(id => !visitedNotebookIds.includes(id));
  return {
    ...progress,
    notebookIds: ordered,
    visitedNotebookIds,
    passStartedAt: progress.passStartedAt ?? updatedAt,
    completedPassHistory: progress.completedPassHistory ?? [],
    currentNotebookIndex: nextIndex >= 0 ? nextIndex : 0,
    updatedAt,
  };
}

export function getCycleProgressPercent(progress: StudyCycleProgress): number {
  if (progress.notebookIds.length === 0) return 0;
  const visited = progress.visitedNotebookIds ?? [];
  return Math.round((visited.filter(id => progress.notebookIds.includes(id)).length / progress.notebookIds.length) * 100);
}

/**
 * Records a completed visit, not a 15-minute threshold.
 * Pausing a partial block must not call this; an intentional manual end may.
 */
export function completeCycleNotebook(
  progress: StudyCycleProgress,
  updatedAt = new Date().toISOString(),
  maxNotebooksPerPass?: number,
): CycleStep {
  const ids = progress.notebookIds;
  if (ids.length === 0) {
    return { progress: { ...progress, visitedNotebookIds: [], updatedAt }, completedPass: false, progressPercent: 0 };
  }
  const currentId = ids[Math.min(Math.max(0, progress.currentNotebookIndex), ids.length - 1)];
  const visited = new Set((progress.visitedNotebookIds ?? []).filter(id => ids.includes(id)));
  if (currentId) visited.add(currentId);
  // A pass is the configured number of distinct notebooks, capped by the
  // number of active notebooks. The cursor keeps rotating across passes.
  const passLimit = Math.min(ids.length, Math.max(1, Math.floor(maxNotebooksPerPass ?? ids.length)));
  const completedPass = visited.size >= passLimit;
  const nextVisited = completedPass ? [] : [...visited];
  const currentIndex = ids.indexOf(currentId);
  let nextIndex = (currentIndex + 1) % ids.length;
  if (!completedPass) {
    for (let offset = 1; offset <= ids.length; offset += 1) {
      const candidate = (currentIndex + offset) % ids.length;
      if (!nextVisited.includes(ids[candidate])) {
        nextIndex = candidate;
        break;
      }
    }
  }
  const nextPassNumber = progress.completedPasses + (completedPass ? 1 : 0);
  const passHistory = progress.completedPassHistory ?? [];
  const nextProgress: StudyCycleProgress = {
    ...progress,
    visitedNotebookIds: nextVisited,
    passStartedAt: completedPass ? updatedAt : (progress.passStartedAt ?? updatedAt),
    completedPassHistory: completedPass ? [...passHistory, { number: nextPassNumber, startedAt: progress.passStartedAt ?? updatedAt, completedAt: updatedAt, notebookIds: [...visited] }] : passHistory,
    currentNotebookIndex: nextIndex,
    completedPasses: nextPassNumber,
    updatedAt,
  };
  return {
    progress: nextProgress,
    completedPass,
    nextNotebookId: ids[nextIndex],
    progressPercent: getCycleProgressPercent(nextProgress),
  };
}
