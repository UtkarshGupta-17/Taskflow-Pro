import { wouldCreateCycle, type Edge } from "@/lib/dag-engine";

interface CandidateTask {
  id: string;
  title: string;
}

interface RawSuggestion {
  predecessorTaskId: string;
  confidence: number;
  rationale: string;
}

export interface ValidatedSuggestion extends RawSuggestion {
  taskTitle: string;
}

export async function suggestDependencies(
  targetTask: { id: string; title: string; description: string | null },
  candidates: CandidateTask[],
  existingEdges: Edge[]
): Promise<ValidatedSuggestion[]> {
  if (candidates.length === 0) return [];

  const candidateList = candidates.map((c) => `- ${c.id}: "${c.title}"`).join("\n");

  const systemPrompt = `You suggest task dependencies for a project management tool.
You will be given a target task and a list of existing tasks with their IDs.
Your job: identify which existing tasks (if any) are likely PREREQUISITES for the target task
(i.e. the existing task should logically be finished BEFORE the target task starts).

Rules:
- You may ONLY reference task IDs from the provided list. Never invent an ID.
- Suggest each distinct predecessor task AT MOST ONCE. Do not repeat the same task under different wording.
- If you are not reasonably confident about a dependency, omit it entirely — do not guess.
- Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
  {"suggestions": [{"predecessorTaskId": "<id>", "confidence": <0.0-1.0>, "rationale": "<one short sentence>"}]}
- If no dependencies are likely, respond with {"suggestions": []}`;

  const userPrompt = `Target task: "${targetTask.title}"
Description: ${targetTask.description || "(none)"}

Existing tasks:
${candidateList}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    console.error("AI suggestion request failed:", await res.text());
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  let raw: RawSuggestion[];
  try {
    const parsed = JSON.parse(content);
    raw = parsed.suggestions ?? [];
  } catch {
    console.error("AI response was not valid JSON:", content);
    return [];
  }

  const candidateIds = new Set(candidates.map((c) => c.id));
  const seenInThisBatch = new Set<string>(); // fixes within-response repeats
  const validated: ValidatedSuggestion[] = [];

  for (const item of raw) {
    if (!candidateIds.has(item.predecessorTaskId)) continue;
    if (item.predecessorTaskId === targetTask.id) continue;
    if (seenInThisBatch.has(item.predecessorTaskId)) continue; // skip repeat within same response

    if (wouldCreateCycle(existingEdges, { predecessorId: item.predecessorTaskId, successorId: targetTask.id })) {
      continue;
    }

    seenInThisBatch.add(item.predecessorTaskId);
    const taskTitle = candidates.find((c) => c.id === item.predecessorTaskId)!.title;
    validated.push({ ...item, taskTitle });
  }

  return validated;
}