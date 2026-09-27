"use client";
import { useState, useCallback } from "react";

export interface Suggestion {
  id: string;
  taskId: string;
  suggestedPredecessorId: string;
  confidence: number;
  rationale: string;
  status: "pending" | "accepted" | "rejected";
}

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (taskId: string) => {
    setLoading(true);
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    const data = await res.json();
    setSuggestions((prev) => [...prev, ...data]);
    setLoading(false);
  }, []);

  const load = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/ai/suggest?taskId=${taskId}`);
    const data = await res.json();
    setSuggestions((prev) => {
      const others = prev.filter((s) => s.taskId !== taskId);
      return [...others, ...data];
    });
  }, []);

  const respond = useCallback(async (id: string, action: "accept" | "reject") => {
    const res = await fetch(`/api/ai/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status: data.status ?? s.status } : s)));
    return res.ok;
  }, []);

  return { suggestions, loading, generate, load, respond };
}