"use client";
import { useState } from "react";

interface DiffItem {
  id: string;
  title: string;
  shiftedDays: number;
}

export function SimulateModal({
  task,
  onClose,
  onApplied,
}: {
  task: { id: string; title: string; durationDays: number };
  onClose: () => void;
  onApplied: () => void;
}) {
  const [newDuration, setNewDuration] = useState(task.durationDays);
  const [diff, setDiff] = useState<DiffItem[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  async function preview() {
    setPreviewing(true);
    setDiff(null);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, newDurationDays: newDuration }),
    });
    const data = await res.json();
    setDiff(data.diff);
    setPreviewing(false);
  }

  async function apply() {
    setApplying(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationDays: newDuration }),
    });
    setApplying(false);
    onApplied();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-[420px] shadow-xl">
        <h2 className="text-[#ECECEC] font-semibold text-base mb-1">Change duration</h2>
        <p className="text-[#9CA3AF] text-sm mb-4">{task.title}</p>

        <label className="text-xs text-[#9CA3AF] block mb-1">Duration (days)</label>
        <input
          type="number"
          min={1}
          value={newDuration}
          onChange={(e) => { setNewDuration(Number(e.target.value)); setDiff(null); }}
          className="w-full mb-4 px-3 py-2 rounded bg-[#1E1E1E] border border-[#3A3A3A] text-[#ECECEC] text-sm focus:outline-none focus:border-[#FF6C37]"
        />

        {diff && (
          <div className="mb-4 max-h-48 overflow-y-auto">
            {diff.length === 0 ? (
              <p className="text-xs text-[#6B7280]">No downstream tasks are affected.</p>
            ) : (
              <>
                <p className="text-xs text-[#9CA3AF] mb-2">This will shift:</p>
                {diff.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-[#3A3A3A] last:border-0">
                    <span className="text-sm text-[#ECECEC]">{d.title}</span>
                    <span className={`text-xs font-medium ${d.shiftedDays > 0 ? "text-[#FF6C37]" : "text-[#4ADE80]"}`}>
                      {d.shiftedDays > 0 ? "+" : ""}{d.shiftedDays}d
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-[#9CA3AF] hover:text-[#ECECEC]">
            Cancel
          </button>
          {!diff ? (
            <button
              onClick={preview}
              disabled={previewing || newDuration === task.durationDays}
              className="px-3 py-1.5 text-sm rounded-md bg-[#3A3A3A] text-[#ECECEC] hover:bg-[#4A4A4A] disabled:opacity-40 transition-colors"
            >
              {previewing ? "Calculating..." : "Preview Impact"}
            </button>
          ) : (
            <button
              onClick={apply}
              disabled={applying}
              className="px-3 py-1.5 text-sm rounded-md bg-[#FF6C37] text-white hover:bg-[#e85f2e] disabled:opacity-60 transition-colors"
            >
              {applying ? "Applying..." : "Apply Change"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}