import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateHealthSummary } from "@/lib/ai/health-summary";

export async function GET() {
  const tasks = await prisma.task.findMany();
  const deps = await prisma.dependency.findMany();
  const edges = deps.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));

  const summary = await generateHealthSummary(
    tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    edges
  );

  return NextResponse.json({ summary });
}