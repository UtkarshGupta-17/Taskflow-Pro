"use client";
import { useState } from "react";

export function AddTaskModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [startDate, setStartDate] = useState("");

  async function submit() {
    if (!title || !startDate) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignee: assignee || null, startDate }),
    });
    setTitle(""); setAssignee(""); setStartDate("");
    setOpen(false);
    onCreated();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-[#FF6C37] text-white text-sm font-medium hover:bg-[#e85f2e] transition-colors"
      >
        + Add Task
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#2D2D2D] border border-[#3A3A3A] rounded-lg p-6 w-96">
            <h2 className="text-[#ECECEC] font-semibold mb-4">New Task</h2>
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded bg-[#1E1E1E] border border-[#3A3A3A] text-[#ECECEC] text-sm focus:outline-none focus:border-[#FF6C37]"
            />
            <input
              placeholder="Assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded bg-[#1E1E1E] border border-[#3A3A3A] text-[#ECECEC] text-sm focus:outline-none focus:border-[#FF6C37]"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mb-4 px-3 py-2 rounded bg-[#1E1E1E] border border-[#3A3A3A] text-[#ECECEC] text-sm focus:outline-none focus:border-[#FF6C37]"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-[#9CA3AF]">Cancel</button>
              <button onClick={submit} className="px-3 py-1.5 text-sm rounded bg-[#FF6C37] text-white">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}