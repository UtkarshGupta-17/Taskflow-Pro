import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing existing data...");
  await prisma.dependencySuggestion.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.task.deleteMany();

  const base = new Date("2026-01-01");

  console.log("Creating tasks...");

  const requirements = await prisma.task.create({
    data: {
      title: "Requirements Gathering",
      description: "Collect and document functional requirements from stakeholders.",
      status: "done",
      assignee: "Priya",
      startDate: base,
      durationDays: 2,
    },
  });

  const dbSchema = await prisma.task.create({
    data: {
      title: "Database Schema Design",
      description: "Design the relational schema for tasks, dependencies, and suggestions.",
      status: "done",
      assignee: "Rahul",
      startDate: base,
      durationDays: 3,
    },
  });

  const uiDesign = await prisma.task.create({
    data: {
      title: "Frontend UI Design",
      description: "Design the Kanban board layout, task cards, and modals.",
      status: "in_progress",
      assignee: "Sana",
      startDate: base,
      durationDays: 3,
    },
  });

  const backendApi = await prisma.task.create({
    data: {
      title: "Backend API Development",
      description: "Build REST endpoints for tasks and dependencies.",
      status: "in_progress",
      assignee: "Rahul",
      startDate: base,
      durationDays: 4,
    },
  });

  const authModule = await prisma.task.create({
    data: {
      title: "Auth Module",
      description: "Implement login and session handling.",
      status: "backlog",
      assignee: "Vikram",
      startDate: base,
      durationDays: 3,
    },
  });

  const integrationTests = await prisma.task.create({
    data: {
      title: "Integration Testing",
      description: "End-to-end tests covering API and UI together — the convergence point of the demo diamond.",
      status: "backlog",
      assignee: "Priya",
      startDate: base,
      durationDays: 2,
    },
  });

  const deployment = await prisma.task.create({
    data: {
      title: "Deployment Pipeline",
      description: "Set up CI/CD and hosting for the production build.",
      status: "backlog",
      assignee: "Vikram",
      startDate: base,
      durationDays: 2,
    },
  });

  const loadTesting = await prisma.task.create({
    data: {
      title: "Load Testing",
      description: "Stress-test the deployed app under concurrent users.",
      status: "backlog",
      assignee: "Sana",
      startDate: base,
      durationDays: 2,
    },
  });

  const documentation = await prisma.task.create({
    data: {
      title: "Documentation",
      description: "Write setup instructions and architecture notes for the README.",
      status: "backlog",
      assignee: "Priya",
      startDate: base,
      durationDays: 1,
    },
  });

  console.log("Wiring dependencies (including the demo diamond)...");

  // The diamond pattern from the problem statement:
  // Requirements -> DB Schema -> Integration Tests
  // Requirements -> UI Design -> Integration Tests
  await prisma.dependency.create({ data: { predecessorId: requirements.id, successorId: dbSchema.id } });
  await prisma.dependency.create({ data: { predecessorId: requirements.id, successorId: uiDesign.id } });
  await prisma.dependency.create({ data: { predecessorId: dbSchema.id, successorId: integrationTests.id } });
  await prisma.dependency.create({ data: { predecessorId: uiDesign.id, successorId: integrationTests.id } });

  // Additional realistic chains
  await prisma.dependency.create({ data: { predecessorId: dbSchema.id, successorId: backendApi.id } });
  await prisma.dependency.create({ data: { predecessorId: dbSchema.id, successorId: authModule.id } });
  await prisma.dependency.create({ data: { predecessorId: integrationTests.id, successorId: deployment.id } });
  await prisma.dependency.create({ data: { predecessorId: authModule.id, successorId: deployment.id } });
  await prisma.dependency.create({ data: { predecessorId: deployment.id, successorId: loadTesting.id } });
  await prisma.dependency.create({ data: { predecessorId: requirements.id, successorId: documentation.id } });

  console.log("Seed complete: 9 tasks, 10 dependencies, one diamond pattern.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });