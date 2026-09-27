interface TaskSnapshot {
  id: string;
  title: string;
  status: string;
}

interface EdgeSnapshot {
  predecessorId: string;
  successorId: string;
}

export async function generateHealthSummary(
  tasks: TaskSnapshot[],
  edges: EdgeSnapshot[]
): Promise<string> {
  // Ground the prompt in metrics the engine already computes — not raw guesswork.
  const inDegree = new Map<string, number>(); // how many tasks depend on this one
  for (const e of edges) {
    inDegree.set(e.predecessorId, (inDegree.get(e.predecessorId) ?? 0) + 1);
  }

  const blockedCount = tasks.filter((t) => {
    const preds = edges.filter((e) => e.successorId === t.id).map((e) => e.predecessorId);
    return t.status === "backlog" && preds.some((p) => tasks.find((x) => x.id === p)?.status !== "done");
  }).length;

  const convergencePoints = tasks
    .filter((t) => edges.filter((e) => e.successorId === t.id).length >= 2)
    .map((t) => t.title);

  const mostDepended = [...inDegree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([id, count]) => ({ title: tasks.find((t) => t.id === id)?.title ?? "Unknown", count }));

  const metricsSummary = `
Total tasks: ${tasks.length}
Currently blocked: ${blockedCount}
Tasks with multiple converging dependencies: ${convergencePoints.join(", ") || "none"}
Most-depended-on task: ${mostDepended[0] ? `"${mostDepended[0].title}" (${mostDepended[0].count} downstream tasks)` : "none"}
`.trim();

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You write a single, plain-English sentence summarizing project schedule risk, based ONLY on the metrics given. Do not invent facts not in the metrics. No preamble, just the one sentence.",
        },
        { role: "user", content: metricsSummary },
      ],
    }),
  });

  if (!res.ok) return "Health summary unavailable right now.";
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "Health summary unavailable right now.";
}