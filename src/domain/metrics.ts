export type Attempt = { questions: number; correct: number; date: string };
export type Exposure = { questions: number; correct: number; date: string };

export type Confidence = "insufficient" | "low" | "moderate" | "high";

export type DomainResult = {
  value: number | null;
  currentPerformance: number;
  consistency: number;
  experience: number;
  totalQuestions: number;
  recentQuestions: number;
  confidence: Confidence;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function weightedRecentAttempts(attempts: Attempt[], limit = 50) {
  const chronological = [...attempts].sort((a, b) => a.date.localeCompare(b.date));
  let remaining = limit;
  let questions = 0;
  let correct = 0;
  for (const item of chronological.reverse()) {
    if (remaining <= 0) break;
    const take = Math.min(item.questions, remaining);
    if (item.questions <= 0 || item.correct < 0 || item.correct > item.questions) continue;
    questions += take;
    correct += item.correct * (take / item.questions);
    remaining -= take;
  }
  return { questions, correct };
}

export function calculateDomain(attempts: Attempt[], exposures: Exposure[]): DomainResult {
  const validAttempts = attempts.filter(a => a.questions > 0 && a.correct >= 0 && a.correct <= a.questions);
  const totalQuestions = sum(validAttempts.map(a => a.questions));
  const recent = weightedRecentAttempts(validAttempts);
  const currentPerformance = (recent.correct + 5) / (recent.questions + 10);

  const validExposures = exposures
    .filter(e => e.questions >= 10 && e.correct >= 0 && e.correct <= e.questions)
    .sort((a, b) => a.date.localeCompare(b.date));
  const rates = validExposures.map(e => (e.correct / e.questions) * 100);
  const mean = rates.length ? sum(rates) / rates.length : 0;
  const variance = rates.length ? sum(rates.map(rate => (rate - mean) ** 2)) / rates.length : 0;
  const standardDeviation = Math.sqrt(variance);
  const rawConsistency = clamp(1 - standardDeviation / 50);
  const exposureCount = validExposures.length;
  const confidenceFactor = Math.min(1, Math.max(0, (exposureCount - 1) / 4));
  const consistency = rawConsistency * confidenceFactor + 0.5 * (1 - confidenceFactor);
  const experience = 1 - Math.exp(-exposureCount / 5);
  const combinedFactor = 0.6 * consistency + 0.4 * experience;
  const calculatedDomain = currentPerformance * (0.7 + 0.3 * combinedFactor);

  const confidence: Confidence =
    totalQuestions < 20 ? "insufficient" :
    totalQuestions < 50 ? "low" :
    totalQuestions < 100 ? "moderate" : "high";

  return {
    value: totalQuestions === 0 ? null : Math.min(totalQuestions < 20 ? 70 : totalQuestions < 50 ? 85 : 100, calculatedDomain * 100),
    currentPerformance: currentPerformance * 100,
    consistency: consistency * 100,
    experience: experience * 100,
    totalQuestions,
    recentQuestions: recent.questions,
    confidence,
  };
}

export type RetentionResult = {
  value: number | null;
  confidence: Confidence;
  weightedQuestions: number;
  latestChangePoints: number | null;
};

export function calculateRetention(exposures: Exposure[]): RetentionResult {
  const valid = exposures
    .filter(e => e.questions >= 10 && e.correct >= 0 && e.correct <= e.questions)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pairs: { score: number; weight: number }[] = [];
  for (let i = 1; i < valid.length; i++) {
    const previous = (valid[i - 1].correct / valid[i - 1].questions) * 100;
    const current = (valid[i].correct / valid[i].questions) * 100;
    if (previous <= 0) continue;
    pairs.push({ score: clamp(current / previous, 0, 1) * 100, weight: Math.min(valid[i - 1].questions, valid[i].questions) });
  }
  const weightedQuestions = sum(pairs.map(pair => pair.weight));
  const weightedScore = pairs.length
    ? sum(pairs.map(pair => pair.score * pair.weight)) / weightedQuestions
    : null;
  const latestChangePoints = valid.length >= 2
    ? (valid[valid.length - 1].correct / valid[valid.length - 1].questions -
       valid[valid.length - 2].correct / valid[valid.length - 2].questions) * 100
    : null;
  const confidence: Confidence =
    weightedQuestions < 10 ? "insufficient" :
    weightedQuestions <= 20 ? "low" :
    weightedQuestions <= 50 ? "moderate" : "high";
  return { value: weightedScore, confidence, weightedQuestions, latestChangePoints };
}
