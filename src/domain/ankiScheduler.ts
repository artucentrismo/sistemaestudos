import { createEmptyCard, fsrs, Rating, type Card as FsrsCard } from "ts-fsrs";

export type ReviewGrade = "again" | "hard" | "good" | "easy";
export type FsrsCardSnapshot = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: number;
  last_review?: string;
};
export type FsrsReviewSnapshot = {
  rating: ReviewGrade;
  reviewedAt: string;
  responseTimeMs: number;
  scheduledAt: string;
  intervalDays: number;
  state: number;
  log: Record<string, unknown>;
};

const scheduler = fsrs();
type FsrsGrade = Parameters<typeof scheduler.next>[2];
const ratings: Record<ReviewGrade, FsrsGrade> = {
  again: Rating.Again as FsrsGrade,
  hard: Rating.Hard as FsrsGrade,
  good: Rating.Good as FsrsGrade,
  easy: Rating.Easy as FsrsGrade,
};

export function createNewFsrsCard(now = new Date()): FsrsCardSnapshot {
  return serializeCard(createEmptyCard(now));
}

export function hydrateFsrsCard(snapshot?: FsrsCardSnapshot, fallbackDate = new Date()): FsrsCard {
  if (!snapshot) return createEmptyCard(fallbackDate);
  return {
    ...snapshot,
    due: new Date(snapshot.due),
    last_review: snapshot.last_review ? new Date(snapshot.last_review) : undefined,
  } as FsrsCard;
}

export function serializeCard(card: FsrsCard): FsrsCardSnapshot {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state,
    ...(card.last_review ? { last_review: card.last_review.toISOString() } : {}),
  };
}

export function previewFsrsIntervals(snapshot?: FsrsCardSnapshot, now = new Date()) {
  const card = hydrateFsrsCard(snapshot, now);
  const preview = scheduler.repeat(card, now);
  return (Object.keys(ratings) as ReviewGrade[]).map(rating => {
    const candidate = (preview as unknown as Record<FsrsGrade, { card: FsrsCard }>)[ratings[rating]];
    return {
      rating,
      due: candidate.card.due.toISOString(),
      intervalDays: Math.max(0, (candidate.card.due.getTime() - now.getTime()) / 86_400_000),
      state: candidate.card.state,
    };
  });
}

export function scheduleFsrsReview(
  snapshot: FsrsCardSnapshot | undefined,
  rating: ReviewGrade,
  reviewedAt: string,
  responseTimeMs: number,
): { card: FsrsCardSnapshot; review: FsrsReviewSnapshot } {
  const now = new Date(reviewedAt);
  const current = hydrateFsrsCard(snapshot, now);
  const result = scheduler.next(current, now, ratings[rating]);
  const intervalDays = Math.max(0, (result.card.due.getTime() - now.getTime()) / 86_400_000);
  return {
    card: serializeCard(result.card),
    review: {
      rating,
      reviewedAt,
      responseTimeMs: Math.max(0, Math.floor(responseTimeMs)),
      scheduledAt: result.card.due.toISOString(),
      intervalDays,
      state: result.card.state,
      log: result.log as unknown as Record<string, unknown>,
    },
  };
}

export function formatReviewInterval(days: number): string {
  if (days < 1 / 24) return Math.max(1, Math.round(days * 1440)) + " min";
  if (days < 1) return Math.max(1, Math.round(days * 24)) + " h";
  if (days < 30) return Math.max(1, Math.round(days)) + (days < 2 ? " dia" : " dias");
  if (days < 365) return Math.round(days / 30) + " meses";
  return (days / 365).toFixed(1).replace(".", ",") + " anos";
}
