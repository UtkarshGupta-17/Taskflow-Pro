import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { suggestDependencies } from "@/lib/ai/suggest-dependencies";
import type { Edge } from "@/lib/dag-engine";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const suggestions = await prisma.dependencySuggestion.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(suggestions);
}

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();

    const targetTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!targetTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const allTasks = await prisma.task.findMany({ where: { id: { not: taskId } } });
    const allDeps = await prisma.dependency.findMany();
    const edges: Edge[] = allDeps.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));

    const suggestions = await suggestDependencies(
      targetTask,
      allTasks.map((t) => ({ id: t.id, title: t.title })),
      edges
    );

    // Skip predecessors already suggested for this task (in any status),
    // so re-generating doesn't create duplicate rows on every click.
    const alreadySuggested = await prisma.dependencySuggestion.findMany({ where: { taskId } });
    const alreadyIds = new Set(alreadySuggested.map((s) => s.suggestedPredecessorId));

    const saved = await Promise.all(
      suggestions
        .filter((s) => !alreadyIds.has(s.predecessorTaskId))
        .map((s) =>
          prisma.dependencySuggestion.create({
            data: {
              taskId,
              suggestedPredecessorId: s.predecessorTaskId,
              confidence: s.confidence,
              rationale: s.rationale,
            },
          })
        )
    );

    return NextResponse.json(saved);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}