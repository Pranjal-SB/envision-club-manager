"use client";

import { useState, useTransition } from "react";
import { setTaskStatus } from "@/app/actions/tasks";
import type { ProjectTask } from "@/lib/queries";
import { STATUS_LABEL, dueState, formatDeadline, type TaskStatus } from "@/lib/format";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "COMPLETED"];

interface Props {
  tasks: ProjectTask[];
  viewerId: string;
  canManage: boolean;
}

/**
 * Status changes go through a segmented control rather than drag-and-drop:
 * the same capability, a fraction of the code, and it works with a keyboard
 * on a phone.
 */
export function TaskBoard({ tasks, viewerId, canManage }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mayMove = (task: ProjectTask) =>
    canManage || (task.assignee?.id === viewerId);

  function move(taskId: string, status: TaskStatus) {
    setError(null);
    const data = new FormData();
    data.set("taskId", taskId);
    data.set("status", status);
    startTransition(async () => {
      const result = await setTaskStatus(data);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 text-[0.875rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      <div className={`grid gap-x-8 gap-y-10 md:grid-cols-3 ${pending ? "opacity-70" : ""}`}>
        {COLUMNS.map((column) => {
          const inColumn = tasks.filter((t) => t.status === column);
          return (
            <section key={column}>
              <h3 className="flex items-baseline gap-2 border-b border-[var(--ink-edge)] pb-2 text-[0.875rem]">
                <span>{STATUS_LABEL[column]}</span>
                <span className="tabular text-[var(--ash)]">{inColumn.length}</span>
              </h3>

              {inColumn.length === 0 ? (
                <p className="py-6 text-[0.875rem] text-[var(--ash)]">Nothing here.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {inColumn.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canMove={mayMove(task)}
                      onMove={(status) => move(task.id, status)}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  canMove,
  onMove,
}: {
  task: ProjectTask;
  canMove: boolean;
  onMove: (status: TaskStatus) => void;
}) {
  const state = dueState(task.dueDate, task.status);
  const high = task.priority === "HIGH" && task.status !== "COMPLETED";

  /*
    Cards are deliberately not uniform. A high-priority task carries more
    weight and a completed one recedes — if every card looked the same, the
    board would carry no information that the text does not already.
  */
  const surface = high
    ? "border-l-2 border-l-[var(--ember)] bg-[var(--ink-lit)]"
    : task.status === "COMPLETED"
      ? "bg-transparent"
      : "bg-[var(--ink-lit)]";

  return (
    <li className={`rounded-[3px] border border-[var(--ink-edge)] p-3 ${surface}`}>
      <p
        className={
          task.status === "COMPLETED"
            ? "text-[0.9375rem] text-[var(--ash)] line-through"
            : "text-[0.9375rem]"
        }
      >
        {task.title}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem]">
        {task.assignee ? (
          <span className="text-[var(--ash)]">{task.assignee.name}</span>
        ) : (
          <span className="text-[var(--glow)]">Needs an owner</span>
        )}
        <span
          className={`tabular ${
            state === "overdue"
              ? "text-[var(--ember)]"
              : state === "soon"
                ? "text-[var(--glow)]"
                : "text-[var(--ash)]"
          }`}
        >
          {formatDeadline(task.dueDate, task.status)}
        </span>
      </div>

      {/* One segmented control in equal thirds, so it reads as a single
          control at any card width instead of three buttons that wrap. */}
      <div
        role="group"
        aria-label="Task status"
        className="mt-3 grid grid-cols-3 overflow-hidden rounded-[3px] border border-[var(--ink-edge)]"
      >
        {COLUMNS.map((status) => {
          const current = status === task.status;
          return (
            <button
              key={status}
              type="button"
              disabled={!canMove || current}
              onClick={() => onMove(status)}
              aria-current={current ? "true" : undefined}
              title={
                canMove
                  ? `Move to ${STATUS_LABEL[status]}`
                  : "Only the assignee or the project lead can move this"
              }
              className={`border-r border-[var(--ink-edge)] px-1 py-1.5 text-[0.6875rem] transition-colors last:border-r-0 ${
                current
                  ? "bg-[var(--ink-edge)] text-[var(--glow)]"
                  : canMove
                    ? "text-[var(--ash)] hover:bg-[var(--ink-edge)] hover:text-[var(--paper)]"
                    : "text-[var(--ink-edge)]"
              }`}
            >
              {STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>
    </li>
  );
}
