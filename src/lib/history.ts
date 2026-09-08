import type { AnalysisResult } from "./analyze.functions";

export type MarkStatus = "open" | "negotiating" | "resolved";

export type Mark = { status: MarkStatus; note: string };

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Session = {
  id: string;
  createdAt: number;
  fileName: string;
  language: string;
  result: AnalysisResult;
  marks: Record<string, Mark>;
  letter?: string;
};

const KEY = "hcd.sessions.v1";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Session[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: Session) {
  if (typeof window === "undefined") return;
  const list = loadSessions().filter((s) => s.id !== session.id);
  list.unshift(session);
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(loadSessions().filter((s) => s.id !== id)));
}

export function getSession(id: string): Session | undefined {
  return loadSessions().find((s) => s.id === id);
}

export const STATUS_LABEL: Record<MarkStatus, string> = {
  open: "Not reviewed",
  negotiating: "Still negotiating",
  resolved: "Resolved",
};

export function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
