import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeSchedule, isReady, type Edge, type TaskNode, type TaskStatus } from "@/lib/dag-engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // Next.js 15+: params is now a Promise, must await it
  const body = await req.json();

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status, statusChangedAt: new Date() }),
      ...(body.startDate && { startDate: new Date(body.startDate) }),
      ...(body.durationDays && { durationDays: body.durationDays }),
    },
  });

  const allTasks = await prisma.task.findMany();
  const allDeps = await prisma.dependency.findMany();
  const edges: Edge[] = allDeps.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));
  const nodes: TaskNode[] = allTasks.map((t) => ({
    id: t.id,
    status: t.status as TaskStatus,
    startDate: t.startDate,
    durationDays: t.durationDays,
  }));

  const schedule = computeSchedule(nodes, edges);
  const statusById = new Map(allTasks.map((t) => [t.id, t.status as TaskStatus]));

  const affected = allTasks
    .filter((t) => edges.some((e) => e.successorId === t.id))
    .map((t) => ({
      id: t.id,
      earliestStart: schedule.get(t.id)!.earliestStart,
      ready: isReady(t.id, edges, statusById),
    }));

  return NextResponse.json({ updated, affected });
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ deleted: id });
}