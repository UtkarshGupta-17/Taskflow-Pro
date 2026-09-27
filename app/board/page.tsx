"use client";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { useTasks, type Task } from "@/lib/useTasks";
import { AddTaskModal } from "@/components/AddTaskModal";
import { WarningModal } from "@/components/WarningModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SimulateModal } from "@/components/SimulateModal";
import { DependencyModal } from "@/components/DependencyModal";
import { SuggestionsPanel } from "@/components/SuggestionsPanel";
import { useState } from "react";
import Link from "next/link";

const COLUMNS: { id: Task["status"]; label: string; dot: string; wipLimit?: number }[] = [
  { id: "backlog", label: "Backlog", dot: "#6B7280" },
  { id: "in_progress", label: "In Progress", dot: "#FF6C37", wipLimit: 5 },
  { id: "review", label: "Review", dot: "#8B7FE8" },
  { id: "done", label: "Done", dot: "#4ADE80" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type FullTask = Task & {
  assignee?: string | null;
  statusChangedAt?: string;
  durationDays: number;
  unmetPrerequisites?: string[];
};

function TaskCard({
  task,
  onDeleteClick,
  onSimulateClick,
  onLinkClick,
  onSuggestClick,
}: {
  task: FullTask;
  onDeleteClick: (id: string, title: string) => void;
  onSimulateClick: (task: Task) => void;
  onLinkClick: (task: Task) => void;
  onSuggestClick: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const [showReasons, setShowReasons] = useState(false);
  const blocked = task.status === "backlog" && !task.ready;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1, // original spot fades while the DragOverlay clone shows on top
      }}
      className="p-3 mb-3 rounded-lg bg-[#2D2D2D] border border-[#3A3A3A] cursor-grab hover:border-[#4A4A4A] transition-colors group relative"
    >
     <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={() => onSuggestClick(task)}
    className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1E1E1E] border border-[#3A3A3A] text-xs hover:border-[#FF6C37] hover:bg-[#3A2A1F] transition-colors"
    title="AI suggestions"
  >
    🤖
  </button>
  <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={() => onSimulateClick(task)}
    className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1E1E1E] border border-[#3A3A3A] text-xs hover:border-[#FF6C37] hover:bg-[#3A2A1F] transition-colors"
    title="Change duration"
  >
    ⏱
  </button>
  <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={() => onLinkClick(task)}
    className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1E1E1E] border border-[#3A3A3A] text-xs hover:border-[#FF6C37] hover:bg-[#3A2A1F] transition-colors"
    title="Add prerequisite"
  >
    🔗
  </button>
  <button
    onPointerDown={(e) => e.stopPropagation()}
    onClick={() => onDeleteClick(task.id, task.title)}
    className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1E1E1E] border border-[#3A3A3A] text-xs hover:border-[#DC2626] hover:bg-[#3A1F1F] transition-colors"
    title="Delete task"
  >
    ✕
  </button>
</div>

      <div className="text-[#ECECEC] text-sm font-medium mb-2 pr-16">{task.title}</div>

      {blocked && (
        <div className="relative inline-block mb-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowReasons((v) => !v)}
            className="inline-block px-2 py-0.5 rounded text-xs bg-[#3A2A1F] text-[#FF9F6B] border border-[#5A3A26] cursor-pointer"
          >
            Blocked ({task.unmetPrerequisites?.length ?? 0})
          </button>
          {showReasons && (
            <div className="absolute z-10 top-full left-0 mt-1 w-56 bg-[#1E1E1E] border border-[#3A3A3A] rounded p-2 shadow-lg">
              <p className="text-xs text-[#9CA3AF] mb-1">Waiting on:</p>
              {(task.unmetPrerequisites ?? []).map((title, i) => (
                <p key={i} className="text-xs text-[#ECECEC]">
                  • {title}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#FF6C37] text-white text-[10px] flex items-center justify-center font-medium">
              {initials(task.assignee)}
            </div>
            <span className="text-xs text-[#9CA3AF]">{task.assignee}</span>
          </div>
        ) : (
          <span />
        )}
        {task.statusChangedAt && (
          <span className="text-xs text-[#6B7280]">{timeAgo(task.statusChangedAt)}</span>
        )}
      </div>
    </div>
  );
}

// Simplified static clone shown in the DragOverlay — no drag listeners, no buttons, just the visual.
function OverlayCard({ task }: { task: FullTask }) {
  const blocked = task.status === "backlog" && !task.ready;
  return (
    <div className="p-3 rounded-lg bg-[#2D2D2D] border border-[#FF6C37] shadow-2xl w-[240px] cursor-grabbing">
      <div className="text-[#ECECEC] text-sm font-medium mb-2">{task.title}</div>
      {blocked && (
        <span className="inline-block px-2 py-0.5 mb-2 rounded text-xs bg-[#3A2A1F] text-[#FF9F6B] border border-[#5A3A26]">
          Blocked ({task.unmetPrerequisites?.length ?? 0})
        </span>
      )}
      <div className="flex items-center justify-between mt-2">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#FF6C37] text-white text-[10px] flex items-center justify-center font-medium">
              {initials(task.assignee)}
            </div>
            <span className="text-xs text-[#9CA3AF]">{task.assignee}</span>
          </div>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function Column({
  id,
  label,
  dot,
  wipLimit,
  tasks,
  onDeleteClick,
  onSimulateClick,
  onLinkClick,
  onSuggestClick,
}: {
  id: Task["status"];
  label: string;
  dot: string;
  wipLimit?: number;
  tasks: FullTask[];
  onDeleteClick: (id: string, title: string) => void;
  onSimulateClick: (task: Task) => void;
  onLinkClick: (task: Task) => void;
  onSuggestClick: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const overLimit = wipLimit !== undefined && tasks.length >= wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] p-3 rounded-lg border ${isOver ? "border-[#FF6C37]" : "border-[#3A3A3A]"} bg-[#232323]`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
        <h3 className="text-[#ECECEC] text-sm font-semibold">{label}</h3>
        <span className="text-xs text-[#6B7280]">
          {tasks.length}
          {wipLimit ? `/${wipLimit}` : ""}
        </span>
      </div>
      {overLimit && <p className="text-xs text-[#FF6C37] mb-2">WIP limit reached</p>}
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          onDeleteClick={onDeleteClick}
          onSimulateClick={onSimulateClick}
          onLinkClick={onLinkClick}
          onSuggestClick={onSuggestClick}
        />
      ))}
    </div>
  );
}

export default function BoardPage() {
  const { tasks, loading, updateTaskStatus, deleteTask, refresh } = useTasks();
  const [warning, setWarning] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [simulateTask, setSimulateTask] = useState<Task | null>(null);
  const [linkTask, setLinkTask] = useState<Task | null>(null);
  const [suggestTask, setSuggestTask] = useState<Task | null>(null);
  const [healthSummary, setHealthSummary] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function loadHealthSummary() {
    setHealthLoading(true);
    const res = await fetch("/api/ai/health-summary");
    const data = await res.json();
    setHealthSummary(data.summary);
    setHealthLoading(false);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    const newStatus = over.id as Task["status"];
    if (!task || task.status === newStatus) return;

    if (newStatus === "in_progress" && !task.ready && task.status === "backlog") {
      setWarning("This task is blocked by unfinished prerequisites and can't move to In Progress yet.");
      return;
    }

    const column = COLUMNS.find((c) => c.id === newStatus);
    const currentCount = tasks.filter((t) => t.status === newStatus).length;
    if (column?.wipLimit && currentCount >= column.wipLimit) {
      setWarning(`${column.label} has reached its work-in-progress limit of ${column.wipLimit}. Move something out first.`);
      return;
    }

    updateTaskStatus(task.id, newStatus);
  }

  if (loading) return <p className="p-4 text-[#9CA3AF]">Loading...</p>;

  const activeTask = tasks.find((t) => t.id === activeId) as FullTask | undefined;

  return (
    <div className="min-h-screen bg-[#1E1E1E] p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[#ECECEC] text-lg font-semibold">TaskFlow Pro</h1>
          <Link href="/board/graph" className="text-xs text-[#FF6C37] hover:underline">
            View Graph →
          </Link>
        </div>
        <AddTaskModal onCreated={refresh} />
      </div>

      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={loadHealthSummary}
          disabled={healthLoading}
          className="text-xs px-2 py-1 rounded border border-[#3A3A3A] text-[#9CA3AF] hover:text-[#ECECEC] disabled:opacity-50"
        >
          {healthLoading ? "Analyzing..." : "🤖 Project health"}
        </button>
        {healthSummary && <p className="text-xs text-[#9CA3AF] italic">{healthSummary}</p>}
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              {...col}
              tasks={tasks.filter((t) => t.status === col.id) as FullTask[]}
              onDeleteClick={(id, title) => setPendingDelete({ id, title })}
              onSimulateClick={(task) => setSimulateTask(task)}
              onLinkClick={(task) => setLinkTask(task)}
              onSuggestClick={(task) => setSuggestTask(task)}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <OverlayCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      {warning && (
        <WarningModal
          title="This board has reached its limit"
          message={warning}
          onClose={() => setWarning(null)}
        />
      )}
      {pendingDelete && (
        <ConfirmModal
          title="Delete this task?"
          message={`"${pendingDelete.title}" and any dependencies connected to it will be permanently removed.`}
          onConfirm={() => {
            deleteTask(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {simulateTask && (
        <SimulateModal
          task={simulateTask}
          onClose={() => setSimulateTask(null)}
          onApplied={refresh}
        />
      )}
      {linkTask && (
        <DependencyModal
          task={linkTask}
          allTasks={tasks}
          onClose={() => setLinkTask(null)}
          onLinked={refresh}
        />
      )}
      {suggestTask && (
        <SuggestionsPanel
          task={suggestTask}
          taskById={new Map(tasks.map((t) => [t.id, t]))}
          onClose={() => setSuggestTask(null)}
          onAccepted={refresh}
        />
      )}
    </div>
  );
}