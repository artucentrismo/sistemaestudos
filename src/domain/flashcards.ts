import type { BaseRecord } from "../storage/database";
import type { FsrsCardSnapshot, FsrsReviewSnapshot } from "./ankiScheduler";

export const REE_INTERVAL_DAYS = [1, 3, 7, 15, 30, 60] as const;
export const DEFAULT_DAILY_REVIEW_LIMIT = 30;
export const MAX_DAILY_REVIEW_LIMIT = 50;
export const MAX_CONSECUTIVE_CORRECT = 5;
export const ARCHIVE_RESPONSE_TIME_MS = 5000;

export type Flashcard = BaseRecord & {
  notebookId?: string;
  /** Legacy origin retained for cards created before notebook ownership. */
  subjectId?: string;
  front: string;
  back: string;
  level: number;
  consecutiveCorrect: number;
  reviewCount: number;
  responseTimeTotalMs: number;
  responseTimeCount: number;
  lastReviewedAt?: string;
  nextReviewAt: string;
  archived: boolean;
  everArchived?: boolean;
  archivedAt?: string;
  reactivationCount?: number;
  recentResults?: boolean[];
  lastCorrectAt?: string;
  fsrsCard?: FsrsCardSnapshot;
};

export type FlashcardReview = BaseRecord & {
  flashcardId: string;
  reviewedAt: string;
  remembered: boolean;
  responseTimeMs: number;
  rating?: "again" | "hard" | "good" | "easy";
  intervalDays?: number;
  scheduledAt?: string;
  schedulerLog?: FsrsReviewSnapshot["log"];
};

export function reviewFlashcard(
  card: Flashcard,
  remembered: boolean,
  responseTimeMs: number,
  reviewedAt = new Date().toISOString(),
): { card: Flashcard; review: FlashcardReview } {
  const safeTime = Math.max(0, Math.floor(responseTimeMs));
  const level = remembered ? Math.min(5, card.level + 1) : 0;
  const consecutiveCorrect = remembered ? card.consecutiveCorrect + 1 : 0;
  const responseTimeTotalMs = card.responseTimeTotalMs + safeTime;
  const responseTimeCount = card.responseTimeCount + 1;
  const averageResponseTime = responseTimeTotalMs / responseTimeCount;
  const recentResults = [...(card.recentResults ?? []), remembered].slice(-30);
  const archived = remembered && consecutiveCorrect >= MAX_CONSECUTIVE_CORRECT &&
    averageResponseTime < ARCHIVE_RESPONSE_TIME_MS;
  const intervalDays = REE_INTERVAL_DAYS[level];
  const nextReview = new Date(reviewedAt);
  nextReview.setDate(nextReview.getDate() + intervalDays);
  const updatedCard: Flashcard = {
    ...card,
    level,
    consecutiveCorrect,
    reviewCount: card.reviewCount + 1,
    responseTimeTotalMs,
    responseTimeCount,
    lastReviewedAt: reviewedAt,
    nextReviewAt: nextReview.toISOString(),
    archived: card.archived || archived,
    everArchived: card.everArchived || archived,
    ...(archived && !card.archived ? { archivedAt: reviewedAt } : {}),
    recentResults,
    ...(remembered ? { lastCorrectAt: reviewedAt } : {}),
    updatedAt: reviewedAt,
  };
  const review: FlashcardReview = {
    id: `review-${card.id}-${card.reviewCount + 1}`,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
    flashcardId: card.id,
    reviewedAt,
    remembered,
    responseTimeMs: safeTime,
  };
  return { card: updatedCard, review };
}


export function reactivateFlashcard(card: Flashcard, updatedAt = new Date().toISOString()): Flashcard {
  return {
    ...card,
    archived: false,
    consecutiveCorrect: 0,
    level: 0,
    reactivationCount: (card.reactivationCount ?? 0) + 1,
    nextReviewAt: updatedAt,
    fsrsCard: undefined,
    updatedAt,
  };
}

export function calculateFlashcardPriority(card: Flashcard, now = new Date()): number {
  const results = card.recentResults ?? [];
  const recurrence = results.length ? (results.filter(result => !result).length / results.length) * 100 : 0;
  const interval = REE_INTERVAL_DAYS[Math.min(5, Math.max(0, card.level))];
  const daysLate = Math.max(0, (now.getTime() - new Date(card.nextReviewAt).getTime()) / 86400000);
  const overdue = Math.min(100, (daysLate / Math.max(1, interval)) * 100);
  const daysSinceSuccess = card.lastCorrectAt
    ? Math.max(0, (now.getTime() - new Date(card.lastCorrectAt).getTime()) / 86400000)
    : 15;
  const forgetting = 100 * (1 - Math.exp(-daysSinceSuccess / 15));
  return 0.5 * recurrence + 0.3 * overdue + 0.2 * forgetting;
}

export function selectDailyReviewQueue(
  cards: Flashcard[],
  now = new Date(),
  limit = DEFAULT_DAILY_REVIEW_LIMIT,
): Flashcard[] {
  const timestamp = now.getTime();
  return cards
    .filter(card => !card.archived && new Date(card.fsrsCard?.due ?? card.nextReviewAt).getTime() <= timestamp)
    .sort((a, b) => {
      const aState = a.fsrsCard?.state ?? 0;
      const bState = b.fsrsCard?.state ?? 0;
      const aQueue = aState === 1 || aState === 3 ? 0 : aState === 2 ? 1 : 2;
      const bQueue = bState === 1 || bState === 3 ? 0 : bState === 2 ? 1 : 2;
      return aQueue - bQueue || calculateFlashcardPriority(b, now) - calculateFlashcardPriority(a, now) || new Date(a.fsrsCard?.due ?? a.nextReviewAt).getTime() - new Date(b.fsrsCard?.due ?? b.nextReviewAt).getTime();
    })
    .slice(0, Math.max(0, Math.min(limit, MAX_DAILY_REVIEW_LIMIT)));
}
