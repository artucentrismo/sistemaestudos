export type GeneralStudyCycleProgress = {
  disciplineIds: string[];
  currentDisciplineId: string;
  elapsedSecondsByDiscipline: Record<string, number>;
  completedRounds: number;
  updatedAt: string;
};

export function createGeneralStudyCycle(disciplineIds: string[], updatedAt = new Date().toISOString()): GeneralStudyCycleProgress {
  return { disciplineIds: [...disciplineIds], currentDisciplineId: disciplineIds[0] ?? "", elapsedSecondsByDiscipline: {}, completedRounds: 0, updatedAt };
}

export function reconcileGeneralStudyCycle(
  progress: GeneralStudyCycleProgress | undefined,
  disciplineIds: string[],
  updatedAt = new Date().toISOString(),
): GeneralStudyCycleProgress {
  if (!progress) return createGeneralStudyCycle(disciplineIds, updatedAt);
  const current = disciplineIds.includes(progress.currentDisciplineId) ? progress.currentDisciplineId : disciplineIds[0] ?? "";
  const elapsed: Record<string, number> = {};
  for (const id of disciplineIds) elapsed[id] = Math.max(0, Math.floor(progress.elapsedSecondsByDiscipline?.[id] ?? 0));
  return { ...progress, disciplineIds: [...disciplineIds], currentDisciplineId: current, elapsedSecondsByDiscipline: elapsed, updatedAt };
}

/** Accumulates only actual study time. Reaching a subject's own target advances to the next subject. */
export function recordGeneralStudyTime(
  progress: GeneralStudyCycleProgress,
  disciplineId: string,
  seconds: number,
  recommendedMinutesByDiscipline: Record<string, number>,
  updatedAt = new Date().toISOString(),
): GeneralStudyCycleProgress {
  if (!progress.disciplineIds.length || !progress.disciplineIds.includes(disciplineId) || seconds <= 0) return { ...progress, updatedAt };
  const elapsed = { ...progress.elapsedSecondsByDiscipline, [disciplineId]: Math.max(0, progress.elapsedSecondsByDiscipline[disciplineId] ?? 0) + Math.floor(seconds) };
  const targetMinutes = Math.max(1, recommendedMinutesByDiscipline[disciplineId] || 60);
  if (elapsed[disciplineId] < targetMinutes * 60) return { ...progress, currentDisciplineId: disciplineId, elapsedSecondsByDiscipline: elapsed, updatedAt };
  const index = progress.disciplineIds.indexOf(disciplineId);
  const last = index === progress.disciplineIds.length - 1;
  const next = progress.disciplineIds[(index + 1) % progress.disciplineIds.length];
  if (last) {
    for (const id of progress.disciplineIds) elapsed[id] = 0;
  } else {
    elapsed[disciplineId] = 0;
  }
  return { ...progress, currentDisciplineId: next, elapsedSecondsByDiscipline: elapsed, completedRounds: progress.completedRounds + (last ? 1 : 0), updatedAt };
}
