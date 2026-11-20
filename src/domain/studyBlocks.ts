/**
 * Regras pedagógicas dos blocos de estudo do EstudosFlix.
 * Um bloco corresponde a 15 minutos acumulados no mesmo caderno.
 * Interrupções preservam o tempo e a posição; só 900 segundos concluem o bloco do caderno.
 */

export const STUDY_BLOCK_SECONDS = 15 * 60;

export type StudyBlockStatus = "in_progress" | "paused" | "completed" | "completed_early";

export type StudyBlock = {
  id: string;
  createdAt: string;
  disciplineId: string;
  notebookId: string;
  elapsedSeconds: number;
  /** Study time already credited to the general subject allocation. */
  generalCreditedSeconds?: number;
  lastQuestionId?: string;
  lastQuestionNumber?: number;
  status: StudyBlockStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type StudyBlockProgress = {
  elapsedSeconds: number;
  remainingSeconds: number;
  completionPercent: number;
  isComplete: boolean;
};

export function getStudyBlockProgress(block: Pick<StudyBlock, "elapsedSeconds">, durationSeconds = STUDY_BLOCK_SECONDS): StudyBlockProgress {
  const duration = Math.max(1, Math.floor(durationSeconds));
  const elapsedSeconds = Math.min(duration, Math.max(0, Math.floor(block.elapsedSeconds)));
  return {
    elapsedSeconds,
    remainingSeconds: duration - elapsedSeconds,
    completionPercent: (elapsedSeconds / duration) * 100,
    isComplete: elapsedSeconds >= duration,
  };
}

/** Adiciona tempo líquido ao bloco ativo. Nunca ultrapassa os 15 minutos. */
export function addStudyTime(block: StudyBlock, seconds: number, now = new Date().toISOString()): StudyBlock {
  if (block.status === "completed" || block.status === "completed_early") return block;
  if (!Number.isFinite(seconds) || seconds <= 0) return block;

  const elapsedSeconds = Math.min(STUDY_BLOCK_SECONDS, block.elapsedSeconds + Math.floor(seconds));
  const completed = elapsedSeconds >= STUDY_BLOCK_SECONDS;

  return {
    ...block,
    elapsedSeconds,
    status: completed ? "completed" : block.status,
    updatedAt: now,
    ...(completed ? { completedAt: now } : {}),
  };
}

/** Pausar mantém o tempo acumulado e a posição do aluno. */
export function pauseStudyBlock(block: StudyBlock, now = new Date().toISOString()): StudyBlock {
  if (block.status !== "in_progress") return block;
  return { ...block, status: "paused", updatedAt: now };
}

/** Retomar não zera o tempo nem altera o caderno/questão. */
export function resumeStudyBlock(block: StudyBlock, now = new Date().toISOString()): StudyBlock {
  if (block.status !== "paused") return block;
  return { ...block, status: "in_progress", updatedAt: now };
}

/** Um bloco de 15 minutos completo libera avanço automático. O encerramento manual antecipado é tratado pela camada de aplicação. */
export function canAdvanceToNextNotebook(block: StudyBlock): boolean {
  return block.status === "completed" && block.elapsedSeconds >= STUDY_BLOCK_SECONDS;
}

/** A quantidade planejada de blocos deriva do tempo disponível, não da quantidade de cadernos cadastrados. */
export function getPlannedBlockCount(totalMinutes: number): number {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return 0;
  return Math.floor(totalMinutes / 15);
}

/** Retorna o próximo caderno elegível em uma rotação circular, sem repetir o atual. */
export function getNextNotebookId(notebookIds: string[], currentNotebookId: string): string | undefined {
  if (notebookIds.length < 2) return undefined;
  const currentIndex = notebookIds.indexOf(currentNotebookId);
  if (currentIndex < 0) return notebookIds[0];
  return notebookIds[(currentIndex + 1) % notebookIds.length];
}
