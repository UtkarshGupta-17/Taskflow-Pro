# TaskFlow Pro

**Repository:** https://github.com/UtkarshGupta-17/Taskflow-Pro
**Live demo:**  https://taskflow-pro-xi-taupe.vercel.app/board

A Kanban board backed by a DAG (Directed Acyclic Graph) dependency engine — tasks can depend on other tasks, get automatically Blocked/Ready based on prerequisite state, and propagate schedule changes correctly across the whole dependency graph.

## Features

- Kanban board (Backlog / In Progress / Review / Done) with drag-and-drop, persisted to Postgres
- WIP limits enforced per column
- Dependency creation with cycle rejection (invalid edges are refused, not silently ignored)
- Explainable Blocked state — click a Blocked badge to see exactly which prerequisites are unmet
- Impact Simulator — preview a schedule change's downstream effect before committing it
- Dependency graph view (`/board/graph`) — the same data as a node graph, colored by status
- AI-assisted dependency suggestions with a human review queue (Accept/Reject), including visibility into rejected/low-confidence suggestions
- AI-generated project-health narrative, grounded in metrics the engine computes
- Seed script producing 9 realistic tasks, including a diamond-dependency pattern, for reliable demoing

## Tech Stack

- **Frontend/Backend:** Next.js 16 (App Router, TypeScript)
- **Database:** PostgreSQL (Neon, free tier)
- **ORM:** Prisma **v6** (pinned deliberately — v7 introduced a driver-adapter requirement, and v8 is still a release candidate with a different CLI; v6 is the last fully stable release using the classic `schema.prisma` + `migrate dev` workflow)
- **Drag-and-drop:** dnd-kit
- **Graph visualization:** React Flow
- **AI:** Groq API (`openai/gpt-oss-20b` — Groq deprecated `llama-3.3-70b-versatile` for free-tier access in August 2026; the model is set via an env var, so switching providers/models requires no code change)
- **Testing:** Vitest

## Setup

```bash
npm install
```

Create a `.env` file:
DATABASE_URL="your-postgres-connection-string"
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="openai/gpt-oss-20b"


Run the database migration:
```bash
npx prisma migrate dev
```

Seed the database with sample tasks (9 tasks including a diamond-dependency pattern, for demoing no-compounding propagation):
```bash
npx prisma db seed
```

Start the dev server:
```bash
npm run dev
```
Visit `http://localhost:3000` (redirects to `/board`).

## Testing

```bash
npx vitest run
```

8 tests across 3 files:
- `tests/dag-engine.test.ts` — unit tests for the core engine: cycle detection, no-compounding diamond propagation, ready/blocked derivation, rollback re-blocking, topological sort
- `tests/api/dependencies.test.ts` — integration test hitting the real `/api/dependencies` route against a real database, confirming a valid edge is accepted and its reverse is rejected with a 409
- `tests/api/tasks.test.ts` — integration test confirming a duration change on a real `/api/tasks/[id]` route correctly propagates to a dependent task

Integration tests clean up their own test data on completion (`afterAll`), so running them never pollutes the seeded demo dataset.

## Architecture

The dependency engine (`lib/dag-engine.ts`) is a pure, framework-agnostic module with no database or React dependencies — every API route calls into it rather than re-implementing graph logic, which keeps the hardest rules centralized and testable in isolation.

- **Cycle detection:** before any new dependency is saved, a DFS runs from the proposed successor; if it can reach the proposed predecessor, the edge would close a loop and is rejected inside a database transaction, so no partial state is ever persisted.

- **No-compounding propagation:** schedule changes use a topological sort plus a forward pass where each task's earliest start is the `MAX` (not the sum) of its predecessors' earliest finish. This is what makes a diamond-shaped dependency (two paths converging on one downstream task) shift correctly once, rather than doubling the delay.

- **Ready/Blocked status:** derived live from whether every direct predecessor is `done` — because this reads current status rather than a cached flag, moving a completed task backward ("rollback") automatically re-blocks its dependents with no special-case code.

- **Graph view:** a secondary visualization (`/board/graph`, React Flow) renders the same task/dependency data as a node graph, colored by status, so the DAG structure is visible directly rather than only inferable from the Kanban view.

## AI-Tool Declaration

This project uses the Groq API (`openai/gpt-oss-20b`) for three features, all grounded to reduce hallucination and keep a human in the loop:

1. **Dependency suggestions** — given a task's title/description and the list of existing task IDs, the model proposes likely prerequisites as structured JSON. Grounding techniques: the model can only reference task IDs it was explicitly given (never invents one); every suggestion is re-validated against the same cycle-detection function a manual edit would use before it's even shown; nothing is auto-applied — suggestions sit in a review queue and only an explicit Accept creates a real dependency, through the identical code path as a manual edit.

2. **Transparency on rejected suggestions** — rejected and lower-confidence suggestions remain visible in the UI rather than hidden, so the "AI proposes, engine enforces, human decides" boundary is demonstrable, not just claimed.

3. **Project-health narrative** — a one-line summary generated from metrics the engine already computes (blocked-task count, dependency convergence points, most-depended-on task), not from unconstrained model reasoning over the whole task list.

Claude (Anthropic) was used throughout development as a pair-programming assistant — for planning the architecture, writing and debugging code, and diagnosing environment/dependency issues (e.g. Prisma version conflicts, a Groq model deprecation encountered mid-build).

## Business Impact & Scalability

Manual dependency tracking (spreadsheets, tribal knowledge) causes two costly failure modes this project directly eliminates: teams starting work that is actually blocked, and schedule slippage going unnoticed until it surfaces at integration. Both are addressed structurally, not just by convention — status is derived live from the graph rather than manually maintained, so it cannot silently drift out of date.

**Scalability:** the propagation engine runs in O(V+E) time via a single topological pass, which comfortably handles graphs of hundreds of tasks on each change. At significantly larger scale, the main change needed is scoping recomputation to the affected downstream subtree rather than the whole graph — the current implementation recomputes globally for simplicity, which is the right tradeoff at this scale but the first thing to optimize beyond it.

**Reusability:** `lib/dag-engine.ts` has zero dependencies on Prisma, Next.js, or React — it is a portable module that could sit behind a different API layer, a different database, or even a different frontend framework without modification. The same is true of the AI grounding pattern (whitelist validation + cycle re-check before any suggestion is trusted), which generalizes to any AI-assisted feature where a model's output needs to be checked against a system of record before being trusted.

**Multi-user path:** explicitly out of scope for this sprint (see Limitations), but the API layer and engine are already stateless per request, so the primary additions needed to support it are auth middleware and a sync mechanism (polling or WebSockets) — not a redesign of the core logic.

## Key Assumptions & Limitations

- **Single-user, no authentication** — multi-user conflict resolution is out of scope for this sprint. The API layer and DAG engine are stateless per-request, so adding auth middleware and either polling or WebSocket-based sync would be the main additions needed to support it later.

- **Day-granularity scheduling** — no hour/minute-level scheduling.
- **AI suggestions assume a small task list** — the full task list is passed in the prompt context; a much larger backlog would need retrieval/filtering rather than passing everything.

- **Prisma pinned to v6** — v7 requires a driver-adapter setup not worth the added complexity/risk mid-sprint; v8 is still a release candidate.

- **Groq model pinned via env var** — `llama-3.3-70b-versatile` was deprecated by Groq for free-tier access during development; currently using `openai/gpt-oss-20b`, configurable via `GROQ_MODEL` without a code change.

- **`npm audit` flags several vulnerabilities**, all in dev-only tooling (vitest's bundler) or an unused Prisma driver (`mysql2`, since this project uses PostgreSQL) — reviewed and confirmed none are in the runtime dependency path; not force-fixed to avoid destabilizing pinned versions.

- **Critical Path view** (highlighting the longest dependency chain) was scoped as an optional bonus per the problem statement and was not built in this sprint, given time constraints.

- **Recompute scope:** schedule/ready-state recompute currently runs across the whole task set on each change; fine at this scale (single digits to low hundreds of tasks), but would need to be scoped to the affected downstream subtree for much larger graphs.

## Demo Walkthrough

A few specific things worth trying that demonstrate the hardest requirements directly:

1. **Cycle rejection:** try linking "Integration Testing" as a prerequisite of "Requirements Gathering" (its own ancestor) — the UI will show a clear rejection message instead of silently succeeding.

2. **No-compounding propagation:** open the ⏱ Impact Simulator on "Requirements Gathering" and increase its duration. Both "Database Schema Design" and "Frontend UI Design" — and their shared dependent, "Integration Testing" — shift by exactly the same amount, not double.

3. **Rollback:** move "Database Schema Design" from Done back to In Progress. "Integration Testing" immediately re-shows as Blocked, naming that task specifically as the unmet prerequisite.

4. **AI suggestions:** open 🤖 on any task without existing suggestions to see a grounded, validated proposal with a rationale — plus the review queue if you reject one.