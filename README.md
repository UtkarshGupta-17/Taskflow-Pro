# TaskFlow Pro

**Repository:** https://github.com/UtkarshGupta-17/Taskflow-Pro
**Live demo:** *(add once deployed)*

A Kanban board backed by a DAG (Directed Acyclic Graph) dependency engine — tasks can depend on other tasks, get automatically Blocked/Ready based on prerequisite state, and propagate schedule changes correctly across the whole dependency graph.

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

Seed the database with sample tasks (includes a diamond-dependency pattern for demoing no-compounding propagation):
```bash
npx prisma db seed
```

Run the tests:
```bash
npx vitest run
```

Start the dev server:
```bash
npm run dev
```
Visit `http://localhost:3000/board`.

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

## Key Assumptions & Limitations

- **Single-user, no authentication** — multi-user conflict resolution is out of scope for this sprint. The API layer and DAG engine are stateless per-request, so adding auth middleware and either polling or WebSocket-based sync would be the main additions needed to support it later.
- **Day-granularity scheduling** — no hour/minute-level scheduling.
- **AI suggestions assume a small task list** — the full task list is passed in the prompt context; a much larger backlog would need retrieval/filtering rather than passing everything.
- **Prisma pinned to v6** — v7 requires a driver-adapter setup not worth the added complexity/risk mid-sprint; v8 is still a release candidate.
- **Groq model pinned via env var** — `llama-3.3-70b-versatile` was deprecated by Groq for free-tier access during development; currently using `openai/gpt-oss-20b`, configurable via `GROQ_MODEL` without a code change.
- **`npm audit` flags several vulnerabilities**, all in dev-only tooling (vitest's bundler) or an unused Prisma driver (`mysql2`, since this project uses PostgreSQL) — reviewed and confirmed none are in the runtime dependency path; not force-fixed to avoid destabilizing pinned versions.
- **Critical Path view** (highlighting the longest dependency chain) was scoped as an optional bonus per the problem statement and was not built in this sprint, given time constraints.
- **Recompute scope:** schedule/ready-state recompute currently runs across the whole task set on each change; fine at this scale (single digits to low hundreds of tasks), but would need to be scoped to the affected downstream subtree for much larger graphs.