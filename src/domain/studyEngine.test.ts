import { describe, expect, it } from "vitest";
import { classifyStudyLevel, evaluateNotebookGates } from "./studyEngine";

describe("study engine", () => {
  it("classifies four progressive levels using sample size and performance", () => {
    expect(classifyStudyLevel([]).level).toBe(1);
    expect(classifyStudyLevel([{notebookId:"a",questions:20,correct:12,date:"2026-01-01"}]).level).toBe(2);
    expect(classifyStudyLevel([{notebookId:"a",questions:50,correct:36,date:"2026-01-01"}]).level).toBe(3);
    expect(classifyStudyLevel([{notebookId:"a",questions:100,correct:85,date:"2026-01-01"}]).level).toBe(4);
  });
  it("unlocks the next notebook after evidence, with a 50-question safety valve", () => {
    const ids = ["a","b","c"];
    expect(evaluateNotebookGates(ids, []).map(x=>x.released)).toEqual([true,false,false]);
    expect(evaluateNotebookGates(ids, [{notebookId:"a",questions:20,correct:12,date:"2026-01-01"}]).map(x=>x.released)).toEqual([true,true,false]);
    expect(evaluateNotebookGates(ids, [{notebookId:"a",questions:50,correct:20,date:"2026-01-01"}]).map(x=>x.released)).toEqual([true,true,false]);
  });
});
