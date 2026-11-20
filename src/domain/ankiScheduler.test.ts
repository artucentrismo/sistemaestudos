import { describe, expect, it } from "vitest";
import { createNewFsrsCard, formatReviewInterval, previewFsrsIntervals, scheduleFsrsReview } from "./ankiScheduler";

describe("FSRS-6 review adapter", () => {
  const now = new Date("2026-11-19T12:00:00.000Z");
  it("creates a new card and previews all four ratings", () => {
    const card = createNewFsrsCard(now);
    expect(card.state).toBe(0);
    expect(previewFsrsIntervals(card, now).map(item => item.rating)).toEqual(["again", "hard", "good", "easy"]);
  });
  it("persists a review state and a reproducible schedule", () => {
    const card = createNewFsrsCard(now);
    const result = scheduleFsrsReview(card, "good", now.toISOString(), 3200);
    expect(result.card.reps).toBe(1);
    expect(result.review.rating).toBe("good");
    expect(result.review.responseTimeMs).toBe(3200);
    expect(new Date(result.card.due).getTime()).toBeGreaterThan(now.getTime());
    expect(result.review.log).toBeTruthy();
  });
  it("formats short and long review intervals for the answer buttons", () => {
    expect(formatReviewInterval(10 / 1440)).toBe("10 min");
    expect(formatReviewInterval(2)).toBe("2 dias");
  });
});
