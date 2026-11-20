import { describe, expect, it } from "vitest";
import { createGeneralStudyCycle, recordGeneralStudyTime, reconcileGeneralStudyCycle } from "./generalStudyCycle";

describe("general subject cycle", () => {
  it("keeps studying the same subject until its personalized target is reached", () => {
    let state = createGeneralStudyCycle(["law", "language"]);
    state = recordGeneralStudyTime(state, "law", 1800, { law: 60, language: 30 });
    expect(state.currentDisciplineId).toBe("law");
    expect(state.elapsedSecondsByDiscipline.law).toBe(1800);
    state = recordGeneralStudyTime(state, "law", 1800, { law: 60, language: 30 });
    expect(state.currentDisciplineId).toBe("language");
    expect(state.elapsedSecondsByDiscipline.law).toBe(0);
  });

  it("does not create debt for missed time and counts only recorded study seconds", () => {
    const state = createGeneralStudyCycle(["law", "language"]);
    const next = recordGeneralStudyTime(state, "law", 900, { law: 60, language: 30 });
    expect(next.currentDisciplineId).toBe("law");
    expect(next.elapsedSecondsByDiscipline.law).toBe(900);
  });

  it("moves to the first subject after completing a full general round", () => {
    let state = createGeneralStudyCycle(["law", "language"]);
    state = recordGeneralStudyTime(state, "law", 3600, { law: 60, language: 30 });
    state = recordGeneralStudyTime(state, "language", 1800, { law: 60, language: 30 });
    expect(state.currentDisciplineId).toBe("law");
    expect(state.completedRounds).toBe(1);
    expect(state.elapsedSecondsByDiscipline.language).toBe(0);
  });

  it("preserves progress when a subject is added or removed", () => {
    const state = { ...createGeneralStudyCycle(["law", "language"]), currentDisciplineId: "language", elapsedSecondsByDiscipline: { law: 120, language: 600 } };
    const next = reconcileGeneralStudyCycle(state, ["law", "language", "logic"]);
    expect(next.currentDisciplineId).toBe("language");
    expect(next.elapsedSecondsByDiscipline.language).toBe(600);
    expect(next.elapsedSecondsByDiscipline.logic).toBe(0);
  });
});
