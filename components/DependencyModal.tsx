"use client";
import { useState } from "react";
import type { Task } from "@/lib/useTasks";

export function DependencyModal({
  task,
  allTasks,
  onClose,
  onLinked,
}: {
  task: Task;
  allTasks: Task[];
  onClose: () => void;
  onLinked: () => void;
}) {
  const [predecessorId, setPredecessorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const otherTasks = allTasks.filter((t) => t.id !== task.id);

  async function submit() {
    if (!predecessorId) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predecessorId, successorId: task.id }),
    });
    setSaving(false);

    if (!res.ok) {
      let message = "Could not create this dependency.";
      try {
        const data = await res.json();
        message = data.error ?? message;
      } catch {
        // response had no JSON body — keep the default message
      }
      setError(message);
      return;
    }

    onLinked();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-[#ECECEC] font-semibold text-base mb-1">Add prerequisite</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">
          "{task.title}" will be blocked until the selected task is done.
        </p>

        <select
          value={predecessorId}
          onChange={(e) => { setPredecessorId(e.target.value); setError(null); }}
          className="w-full mb-3 px-3 py-2 rounded bg-[#1E1E1E] border border-[#3A3A3A] text-[#ECECEC] text-sm focus:outline-none focus:border-[#FF6C37]"
        >
          <option value="">Select a task...</option>
          {otherTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>

        {error && <p className="text-xs text-[#FF6C37] mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-[#9CA3AF] hover:text-[#ECECEC]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!predecessorId || saving}
            className="px-3 py-1.5 text-sm rounded-md bg-[#FF6C37] text-white disabled:opacity-40 transition-colors"
          >
            {saving ? "Linking..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}