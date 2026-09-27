export type TaskStatus = "backlog" | "in_progress" | "review" | "done";

export interface TaskNode {
  id: string;
  status: TaskStatus;
  startDate: Date;
  durationDays: number;
}

export interface Edge {
  predecessorId: string;
  successorId: string;
}

export function wouldCreateCycle(edges: Edge[], newEdge: Edge): boolean {
  const { predecessorId: from, successorId: to } = newEdge;
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (!adjacency.has(e.predecessorId)) adjacency.set(e.predecessorId, []);
    adjacency.get(e.predecessorId)!.push(e.successorId);
  }
  const visited = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const current = stack.pop()!;
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

export function topoSort(nodeIds: string[], edges: Edge[]): string[] {
  const inDegree = new Map(nodeIds.map((id) => [id, 0]));
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    inDegree.set(e.successorId, (inDegree.get(e.successorId) ?? 0) + 1);
    if (!adjacency.has(e.predecessorId)) adjacency.set(e.predecessorId, []);
    adjacency.get(e.predecessorId)!.push(e.successorId);
  }
  const queue = nodeIds.filter((id) => inDegree.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const next of adjacency.get(n) ?? []) {
      inDegree.set(next, inDegree.get(next)! - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }
  return order;
}

export function isReady(taskId: string, edges: Edge[], statusById: Map<string, TaskStatus>): boolean {
  const predecessors = edges.filter((e) => e.successorId === taskId).map((e) => e.predecessorId);
  return predecessors.every((p) => statusById.get(p) === "done");
}

export interface ScheduleResult {
  earliestStart: Date;
  earliestFinish: Date;
}

export function computeSchedule(nodes: TaskNode[], edges: Edge[]): Map<string, ScheduleResult> {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const order = topoSort(nodes.map((n) => n.id), edges);
  const result = new Map<string, ScheduleResult>();
  for (const id of order) {
    const node = nodeById.get(id)!;
    const preds = edges.filter((e) => e.successorId === id).map((e) => e.predecessorId);
    let earliestStart = node.startDate;
    for (const p of preds) {
      const predFinish = result.get(p)?.earliestFinish;
      if (predFinish && predFinish > earliestStart) earliestStart = predFinish;
    }
    const earliestFinish = addDays(earliestStart, node.durationDays);
    result.set(id, { earliestStart, earliestFinish });
  }
  return result;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}