"use client";
import { useSuggestions } from "@/lib/useSuggestions";
import type { Task } from "@/lib/useTasks";

export function SuggestionsPanel({
  task,
  taskById,
  onClose,
  onAccepted,
}: {
  task: Task;
  taskById: Map<string, Task>;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const { suggestions, loading, generate, load, respond } = useSuggestions();

  const relevant = suggestions.filter((s) => s.taskId === task.id);
  const accepted = relevant.filter((s) => s.status === "accepted");
  const rejected = relevant.filter((s) => s.status === "rejected");
  const pending = relevant.filter((s) => s.status === "pending");
  const hasLoadedAnything = relevant.length > 0;

  async function handleGenerateClick() {
    await load(task.id);   // show anything already reviewed for this task
    await generate(task.id); // then ask for new ones (server dedupes automatically)
  }

  async function handle(id: string, action: "accept" | "reject") {
    const ok = await respond(id, action);
    if (ok && action === "accept") onAccepted();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-[440px] shadow-xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-[#ECECEC] font-semibold text-base mb-1">AI-suggested prerequisites</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">for "{task.title}"</p>

        {!hasLoadedAnything && (
          <button
            onClick={handleGenerateClick}
            disabled={loading}
            className="w-full mb-2 px-3 py-2 rounded-md bg-[#FF6C37] text-white text-sm disabled:opacity-60"
          >
            {loading ? "Analyzing task..." : "Generate suggestions"}
          </button>
        )}

        {pending.map((s) => (
          <div key={s.id} className="border border-[#3A3A3A] rounded p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#ECECEC] font-medium">
                {taskById.get(s.suggestedPredecessorId)?.title ?? "Unknown task"}
              </span>
              <span className="text-xs text-[#9CA3AF]">{Math.round(s.confidence * 100)}% confident</span>
            </div>
            <p className="text-xs text-[#9CA3AF] mb-2">{s.rationale}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handle(s.id, "accept")}
                className="px-2 py-1 text-xs rounded bg-[#FF6C37] text-white"
              >
                Accept
              </button>
              <button
                onClick={() => handle(s.id, "reject")}
                className="px-2 py-1 text-xs rounded border border-[#3A3A3A] text-[#9CA3AF]"
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {(accepted.length > 0 || rejected.length > 0) && (
          <div className="mt-3 pt-3 border-t border-[#3A3A3A]">
            <p className="text-xs text-[#6B7280] mb-2">Reviewed</p>
            {[...accepted, ...rejected].map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                <span className="text-[#9CA3AF]">{taskById.get(s.suggestedPredecessorId)?.title ?? "Unknown"}</span>
                <span className={s.status === "accepted" ? "text-[#4ADE80]" : "text-[#6B7280]"}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-[#9CA3AF] hover:text-[#ECECEC]">
          Close
        </button>
      </div>
    </div>
  );
}