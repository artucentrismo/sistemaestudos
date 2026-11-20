export type EngineAttempt = { notebookId: string; questions: number; correct: number; date: string };
export type StudyLevel = 1 | 2 | 3 | 4;
export type LevelResult = {
  level: StudyLevel;
  title: string;
  description: string;
  totalQuestions: number;
  correct: number;
  accuracy: number | null;
  recentAccuracy: number | null;
  confidence: "insuficiente" | "baixa" | "moderada" | "boa" | "alta";
  nextLevelAt: string;
};
export type NotebookGate = {
  notebookId: string;
  released: boolean;
  reason: string;
  questions: number;
  accuracy: number | null;
};

const valid = (items: EngineAttempt[]) => items.filter(x =>
  x.questions > 0 && Number.isFinite(x.questions) && Number.isFinite(x.correct) &&
  x.correct >= 0 && x.correct <= x.questions
);

export function classifyStudyLevel(attempts: EngineAttempt[]): LevelResult {
  const rows = valid(attempts);
  const totalQuestions = rows.reduce((sum, x) => sum + x.questions, 0);
  const correct = rows.reduce((sum, x) => sum + x.correct, 0);
  const accuracy = totalQuestions ? correct / totalQuestions * 100 : null;
  const recent = [...rows].sort((a,b) => a.date.localeCompare(b.date)).reverse().reduce(
    (acc, row) => {
      const take = Math.min(row.questions, Math.max(0, 50 - acc.questions));
      return { questions: acc.questions + take, correct: acc.correct + row.correct * take / row.questions };
    }, { questions: 0, correct: 0 }
  );
  const recentAccuracy = recent.questions ? recent.correct / recent.questions * 100 : null;
  let level: StudyLevel = 1;
  if (totalQuestions >= 20) level = 2;
  if (totalQuestions >= 50 && (accuracy ?? 0) >= 70) level = 3;
  if (totalQuestions >= 100 && (accuracy ?? 0) >= 80 && (recentAccuracy ?? 0) >= 75) level = 4;
  const confidence: LevelResult["confidence"] =
    totalQuestions < 10 ? "insuficiente" :
    totalQuestions < 20 ? "baixa" :
    totalQuestions < 50 ? "moderada" :
    totalQuestions < 100 ? "boa" : "alta";
  const levels = [
    { title: "Iniciante", description: "Construindo a base e conhecendo o edital.", next: "20 questões registradas" },
    { title: "Fundamentos", description: "Amostra inicial formada. O motor começa a identificar padrões.", next: "50 questões e aproveitamento de 70%" },
    { title: "Desenvolvimento", description: "Desempenho consistente em evolução. O foco passa a ser consolidar e corrigir lacunas.", next: "100 questões, 80% geral e 75% recente" },
    { title: "Consolidação", description: "Boa evidência de domínio. Continue revisando para manter o desempenho.", next: "Manter desempenho e ampliar a cobertura do edital" }
  ];
  return { level, title: levels[level-1].title, description: levels[level-1].description,
    totalQuestions, correct, accuracy, recentAccuracy, confidence, nextLevelAt: levels[level-1].next };
}

export function evaluateNotebookGates(notebookIds: string[], attempts: EngineAttempt[]): NotebookGate[] {
  const rows = valid(attempts);
  return notebookIds.map((notebookId, index) => {
    const evidence = rows.filter(x => x.notebookId === notebookId);
    const questions = evidence.reduce((sum, x) => sum + x.questions, 0);
    const correct = evidence.reduce((sum, x) => sum + x.correct, 0);
    const accuracy = questions ? correct / questions * 100 : null;
    if (index === 0) return { notebookId, released: true, reason: "Primeiro caderno da sequência", questions, accuracy };
    const previousId = notebookIds[index-1];
    const previous = rows.filter(x => x.notebookId === previousId);
    const previousQuestions = previous.reduce((sum, x) => sum + x.questions, 0);
    const previousCorrect = previous.reduce((sum, x) => sum + x.correct, 0);
    const previousAccuracy = previousQuestions ? previousCorrect / previousQuestions * 100 : null;
    const released = previousQuestions >= 20 && (previousAccuracy! >= 60 || previousQuestions >= 50);
    const reason = released
      ? previousAccuracy! >= 60
        ? "Liberado: caderno anterior atingiu 20 questões e 60% de aproveitamento."
        : "Liberado após 50 questões para evitar bloqueio prolongado. Reforce os pontos de dificuldade."
      : `Aguardando o caderno anterior: ${previousQuestions}/20 questões e meta inicial de 60%.`;
    return { notebookId, released, reason, questions, accuracy };
  });
}
