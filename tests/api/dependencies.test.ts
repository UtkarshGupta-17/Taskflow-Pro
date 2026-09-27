import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as createTask } from "../../app/api/tasks/route";
import { POST as createDependency } from "../../app/api/dependencies/route";
import { prisma } from "../../lib/prisma";

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: dependency cycle rejection (real HTTP route, real database)", () => {
  const createdTaskIds: string[] = [];

  it("creates two tasks, allows a valid dependency, then rejects the reverse edge as a cycle", async () => {
    const aRes = await createTask(
      makeRequest("http://localhost/api/tasks", { title: "Test Task A (auto)", startDate: "2026-01-01" })
    );
    expect(aRes.status).toBe(201);
    const a = await aRes.json();
    createdTaskIds.push(a.id);

    const bRes = await createTask(
      makeRequest("http://localhost/api/tasks", { title: "Test Task B (auto)", startDate: "2026-01-01" })
    );
    expect(bRes.status).toBe(201);
    const b = await bRes.json();
    createdTaskIds.push(b.id);

    // A -> B is a valid, non-cyclic edge
    const validRes = await createDependency(
      makeRequest("http://localhost/api/dependencies", { predecessorId: a.id, successorId: b.id })
    );
    expect(validRes.status).toBe(201);

    // B -> A would close a loop and must be rejected with 409
    const cycleRes = await createDependency(
      makeRequest("http://localhost/api/dependencies", { predecessorId: b.id, successorId: a.id })
    );
    expect(cycleRes.status).toBe(409);
    const cycleBody = await cycleRes.json();
    expect(cycleBody.error).toMatch(/circular/i);
  });

  afterAll(async () => {
    // Cleanup: deleting the tasks cascades to their dependency (schema has onDelete: Cascade)
    await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.$disconnect();
  });
});
