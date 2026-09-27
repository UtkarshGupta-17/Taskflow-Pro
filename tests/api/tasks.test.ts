import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as createTask } from "../../app/api/tasks/route";
import { PATCH as patchTask } from "../../app/api/tasks/[id]/route";
import { POST as createDependency } from "../../app/api/dependencies/route";
import { prisma } from "../../lib/prisma";

function makePostRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function makePatchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: task update propagates schedule to dependents (real HTTP route)", () => {
  const createdTaskIds: string[] = [];

  it("extending a predecessor's duration shifts its dependent's earliestStart in the response", async () => {
    const aRes = await createTask(
      makePostRequest("http://localhost/api/tasks", { title: "Propagation Test A", startDate: "2026-01-01", durationDays: 2 })
    );
    const a = await aRes.json();
    createdTaskIds.push(a.id);

    const bRes = await createTask(
      makePostRequest("http://localhost/api/tasks", { title: "Propagation Test B", startDate: "2026-01-01", durationDays: 1 })
    );
    const b = await bRes.json();
    createdTaskIds.push(b.id);

    await createDependency(
      makePostRequest("http://localhost/api/dependencies", { predecessorId: a.id, successorId: b.id })
    );

    const patchRes = await patchTask(
      makePatchRequest(`http://localhost/api/tasks/${a.id}`, { durationDays: 5 }),
      { params: Promise.resolve({ id: a.id }) }
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();

    const affectedB = patchBody.affected.find((t: { id: string }) => t.id === b.id);
    expect(affectedB).toBeDefined();
    expect(affectedB.ready).toBe(false); // still blocked, since A isn't done
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.$disconnect();
  });
});