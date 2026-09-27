import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { wouldCreateCycle, type Edge } from "@/lib/dag-engine";

export async function POST(req: NextRequest) {
  try {
    const { predecessorId, successorId } = await req.json();

    if (!predecessorId || !successorId) {
      return NextResponse.json({ error: "Both tasks are required." }, { status: 400 });
    }
    if (predecessorId === successorId) {
      return NextResponse.json({ error: "A task cannot depend on itself." }, { status: 400 });
    }

    const existing = await prisma.dependency.findMany();
    const edges: Edge[] = existing.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId }));

    if (wouldCreateCycle(edges, { predecessorId, successorId })) {
      return NextResponse.json(
        { error: "This dependency would create a circular relationship and was not saved." },
        { status: 409 }
      );
    }

    const dependency = await prisma.dependency.create({ data: { predecessorId, successorId } });
    return NextResponse.json(dependency, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "This dependency already exists." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong creating this dependency." }, { status: 500 });
  }
}
export async function GET() {
  const dependencies = await prisma.dependency.findMany();
  return NextResponse.json(dependencies);
}