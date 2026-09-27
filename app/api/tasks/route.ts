import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReady, type Edge, type TaskStatus } from "@/lib/dag-engine";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany();
    const dependencies = await prisma.dependency.findMany();
    const edges: Edge[] = dependencies.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));
    const statusById = new Map(tasks.map((t) => [t.id, t.status as TaskStatus]));
    const titleById = new Map(tasks.map((t) => [t.id, t.title]));

    const withDerivedState = tasks.map((t) => {
      const predecessorIds = edges.filter((e) => e.successorId === t.id).map((e) => e.predecessorId);
      const unmetPrerequisites = predecessorIds
        .filter((pid) => statusById.get(pid) !== "done")
        .map((pid) => titleById.get(pid) ?? "Unknown task");

      return {
        ...t,
        ready: t.status === "backlog" ? isReady(t.id, edges, statusById) : true,
        unmetPrerequisites,
      };
    });

    return NextResponse.json(withDerivedState);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load tasks." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.startDate) {
      return NextResponse.json({ error: "Title and start date are required." }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        assignee: body.assignee ?? null,
        startDate: new Date(body.startDate),
        durationDays: body.durationDays ?? 1,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}