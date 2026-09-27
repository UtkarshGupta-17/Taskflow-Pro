"use client";
import { useEffect, useState } from "react";
import ReactFlow, { Background, Controls, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  status: string;
}
interface Dependency {
  predecessorId: string;
  successorId: string;
}

// Simple layered layout: depth = longest path from any root, x = depth, y = position within that depth
function layoutNodes(tasks: Task[], deps: Dependency[]): Node[] {
  const depth = new Map<string, number>();
  const incoming = new Map<string, string[]>();
  tasks.forEach((t) => incoming.set(t.id, deps.filter((d) => d.successorId === t.id).map((d) => d.predecessorId)));

  function computeDepth(id: string, seen = new Set<string>()): number {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.has(id)) return 0; // cycle guard, shouldn't happen given engine rules
    seen.add(id);
    const preds = incoming.get(id) ?? [];
    const d = preds.length === 0 ? 0 : Math.max(...preds.map((p) => computeDepth(p, seen))) + 1;
    depth.set(id, d);
    return d;
  }
  tasks.forEach((t) => computeDepth(t.id));

  const byDepth = new Map<number, string[]>();
  tasks.forEach((t) => {
    const d = depth.get(t.id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(t.id);
  });

  const statusColor: Record<string, string> = {
    backlog: "#6B7280",
    in_progress: "#FF6C37",
    review: "#8B7FE8",
    done: "#4ADE80",
  };

  return tasks.map((t) => {
    const d = depth.get(t.id)!;
    const siblings = byDepth.get(d)!;
    const indexInLevel = siblings.indexOf(t.id);
    return {
      id: t.id,
      position: { x: d * 240, y: indexInLevel * 100 },
      data: { label: t.title },
      style: {
        background: "#2D2D2D",
        color: "#ECECEC",
        border: `2px solid ${statusColor[t.status] ?? "#3A3A3A"}`,
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
        width: 180,
      },
    };
  });
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tasksRes, depsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/dependencies"),
      ]);
      const tasks: Task[] = await tasksRes.json();
      const deps: Dependency[] = await depsRes.json();

      setNodes(layoutNodes(tasks, deps));
      setEdges(
        deps.map((d, i) => ({
          id: `e${i}`,
          source: d.predecessorId,
          target: d.successorId,
          animated: false,
          style: { stroke: "#6B7280" },
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p className="p-4 text-[#9CA3AF] bg-[#1E1E1E] min-h-screen">Loading graph...</p>;

  return (
    <div className="h-screen w-screen bg-[#1E1E1E]">
      <div className="flex items-center gap-4 p-4">
        <h1 className="text-[#ECECEC] text-lg font-semibold">Dependency Graph</h1>
        <Link href="/board" className="text-xs text-[#FF6C37] hover:underline">
          ← Back to Kanban
        </Link>
      </div>
      <div style={{ height: "calc(100vh - 64px)" }}>
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background color="#3A3A3A" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}