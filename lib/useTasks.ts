"use client";
import { useState, useEffect, useCallback } from "react";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "backlog" | "in_progress" | "review" | "done";
  startDate: string;
  durationDays: number;
  ready: boolean;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);


  const deleteTask = useCallback(async (id: string) => {
  setTasks((prev) => prev.filter((t) => t.id !== id)); // optimistic
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) await refresh(); // roll back on failure
}, [refresh]);

  const updateTaskStatus = useCallback(async (id: string, status: Task["status"]) => {
    // optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) await refresh(); // roll back on failure by re-syncing
    else await refresh(); // pick up any downstream ready/blocked changes
  }, [refresh]);

  return { tasks, loading, updateTaskStatus, deleteTask, refresh };
}