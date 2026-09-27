import { describe, it, expect } from "vitest";
import { wouldCreateCycle, topoSort, computeSchedule, isReady, type TaskNode, type Edge } from "../lib/dag-engine";

describe("wouldCreateCycle", () => {
  it("rejects an edge that would close a loop", () => {
    const edges: Edge[] = [
      { predecessorId: "A", successorId: "B" },
      { predecessorId: "B", successorId: "C" },
    ];
    expect(wouldCreateCycle(edges, { predecessorId: "C", successorId: "A" })).toBe(true);
  });

  it("allows a valid new edge", () => {
    const edges: Edge[] = [{ predecessorId: "A", successorId: "B" }];
    expect(wouldCreateCycle(edges, { predecessorId: "A", successorId: "C" })).toBe(false);
  });
});

describe("computeSchedule — no compounding on diamond convergence", () => {
  it("shifts D once, not twice, when two paths converge", () => {
    const base = new Date("2026-01-01");
    const nodes: TaskNode[] = [
      { id: "A", status: "in_progress", startDate: base, durationDays: 3 },
      { id: "B", status: "backlog", startDate: base, durationDays: 2 },
      { id: "C", status: "backlog", startDate: base, durationDays: 2 },
      { id: "D", status: "backlog", startDate: base, durationDays: 1 },
    ];
    const edges: Edge[] = [
      { predecessorId: "A", successorId: "B" },
      { predecessorId: "A", successorId: "C" },
      { predecessorId: "B", successorId: "D" },
      { predecessorId: "C", successorId: "D" },
    ];
    const schedule = computeSchedule(nodes, edges);
    expect(schedule.get("D")!.earliestStart.getTime()).toBe(new Date("2026-01-06").getTime());
  });
});

describe("isReady", () => {
  it("is blocked while a predecessor is not done, ready once it is", () => {
    const edges: Edge[] = [{ predecessorId: "A", successorId: "B" }];
    expect(isReady("B", edges, new Map([["A", "in_progress" as const]]))).toBe(false);
    expect(isReady("B", edges, new Map([["A", "done" as const]]))).toBe(true);
  });

  it("rollback re-blocks a successor", () => {
    const edges: Edge[] = [{ predecessorId: "A", successorId: "B" }];
    expect(isReady("B", edges, new Map([["A", "done" as const]]))).toBe(true);
    expect(isReady("B", edges, new Map([["A", "in_progress" as const]]))).toBe(false);
  });
});

describe("topoSort", () => {
  it("orders predecessors before successors", () => {
    const edges: Edge[] = [
      { predecessorId: "A", successorId: "B" },
      { predecessorId: "B", successorId: "C" },
    ];
    const order = topoSort(["A", "B", "C"], edges);
    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
  });
});