import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wouldCreateCycle, type Edge } from "@/lib/dag-engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await req.json(); // "accept" | "reject"

  const suggestion = await prisma.dependencySuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });

  if (action === "reject") {
    const updated = await prisma.dependencySuggestion.update({
      where: { id },
      data: { status: "rejected" },
    });
    return NextResponse.json(updated);
  }

  if (action === "accept") {
    const existing = await prisma.dependency.findMany();
    const edges: Edge[] = existing.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));

    if (wouldCreateCycle(edges, { predecessorId: suggestion.suggestedPredecessorId, successorId: suggestion.taskId })) {
      return NextResponse.json({ error: "This dependency would now create a cycle." }, { status: 409 });
    }

    await prisma.dependency.create({
      data: { predecessorId: suggestion.suggestedPredecessorId, successorId: suggestion.taskId },
    });
    const updated = await prisma.dependencySuggestion.update({
      where: { id },
      data: { status: "accepted" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}