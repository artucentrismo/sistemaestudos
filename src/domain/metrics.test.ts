import { describe, expect, it } from "vitest";
import { calculateDomain, calculateRetention } from "./metrics";

describe("calculateDomain", () => {
  it("caps domain at 70% with fewer than 20 questions", () => {
    const result = calculateDomain([{ questions: 1, correct: 1, date: "2026-01-01" }], []);
    expect(result.value).toBeLessThanOrEqual(70);
    expect(result.confidence).toBe("insufficient");
  });

  it("smooths a perfect but small sample", () => {
    const result = calculateDomain([{ questions: 20, correct: 20, date: "2026-01-01" }], []);
    expect(result.currentPerformance).toBeCloseTo(83.333, 2);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeLessThanOrEqual(result.currentPerformance);
  });

  it("caps domain at 85% while evidence is between 20 and 49 questions", () => {
    const result = calculateDomain([{ questions: 30, correct: 30, date: "2026-01-01" }], []);
    expect(result.value).toBeLessThanOrEqual(85);
    expect(result.confidence).toBe("low");
  });

  it("never allows domain to exceed current smoothed performance", () => {
    const attempts = [{ questions: 100, correct: 45, date: "2026-01-01" }];
    const exposures = Array.from({ length: 8 }, (_, i) => ({ questions: 20, correct: 20, date: `2026-01-${String(i + 1).padStart(2, "0")}` }));
    const result = calculateDomain(attempts, exposures);
    expect(result.value!).toBeLessThanOrEqual(result.currentPerformance);
  });
});

describe("calculateRetention", () => {
  it("calculates preserved performance between exposures", () => {
    const result = calculateRetention([
      { questions: 20, correct: 16, date: "2026-01-01" },
      { questions: 20, correct: 15.2, date: "2026-01-02" },
    ]);
    expect(result.value).toBeCloseTo(95, 5);
  });

  it("does not calculate retention from a zero baseline", () => {
    const result = calculateRetention([
      { questions: 10, correct: 0, date: "2026-01-01" },
      { questions: 10, correct: 4, date: "2026-01-02" },
    ]);
    expect(result.value).toBeNull();
    expect(result.latestChangePoints).toBe(40);
  });

  it("requires two valid exposures", () => {
    const result = calculateRetention([{ questions: 9, correct: 8, date: "2026-01-01" }]);
    expect(result.value).toBeNull();
    expect(result.confidence).toBe("insufficient");
  });
});
