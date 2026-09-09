export type DueState = "done" | "overdue" | "soon" | "later";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

const DAY = 24 * 60 * 60 * 1000;
const SOON_DAYS = 3;

/**
 * The single source of every state colour in the interface.
 *
 * Completed work is `done` regardless of its deadline — a task finished late is
 * finished, and colouring it red forever would be a lie about what needs
 * attention now.
 */
export function dueState(dueDate: Date | null, status: TaskStatus, now: Date = new Date()): DueState {
  if (status === "COMPLETED") return "done";
  if (!dueDate) return "later";

  const diff = dueDate.getTime() - now.getTime();
  if (diff < 0) return "overdue";
  if (diff <= SOON_DAYS * DAY) return "soon";
  return "later";
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "3 Oct", or with the year when it is not the current one. */
export function formatDate(date: Date | null, now: Date = new Date()): string {
  if (!date) return "No deadline";
  if (date.getFullYear() !== now.getFullYear()) {
    return `${dateFormat.format(date)} ${date.getFullYear()}`;
  }
  return dateFormat.format(date);
}

/**
 * Deadlines written the way a person would say them out loud.
 * "4 days late" carries more than a date does.
 */
export function formatDeadline(date: Date | null, status: TaskStatus, now: Date = new Date()): string {
  if (!date) return "No deadline";
  if (status === "COMPLETED") return `Due ${formatDate(date, now)}`;

  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
  if (days < -1) return `${Math.abs(days)} days late`;
  if (days === -1) return "1 day late";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${formatDate(date, now)}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Relative time for the activity log: "4h ago", "yesterday", "12 Sep". */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(diff / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date, now);
}

export interface Progress {
  total: number;
  completed: number;
  percent: number;
}

export function progressOf(counts: { total: number; completed: number }): Progress {
  const percent = counts.total === 0 ? 0 : Math.round((counts.completed / counts.total) * 100);
  return { total: counts.total, completed: counts.completed, percent };
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** Headlines read better as words than digits: "Three tasks are late." */
export function countInWords(n: number): string {
  return WORDS[n] ?? String(n);
}

export function pluralise(n: number, singular: string, plural = `${singular}s`): string {
  return n === 1 ? singular : plural;
}

/** `<input type="date">` wants yyyy-mm-dd in local time, not an ISO instant. */
export function toDateInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
