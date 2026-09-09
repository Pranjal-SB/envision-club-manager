"use client";

import { useState, useTransition } from "react";
import { deleteTask, setTaskStatus } from "@/app/actions/tasks";
import { TaskForm } from "@/components/TaskForm";
import { rowAction, rowActions } from "@/components/ui";
import type { ProjectTask } from "@/lib/queries";
import { STATUS_LABEL, dueState, formatDeadline, type TaskStatus } from "@/lib/format";

const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "COMPLETED"];

interface Props {
  tasks: ProjectTask[];
  viewerId: string;
  canManage: boolean;
  team: Array<{ userId: string; name: string }>;
  projectId: string;
}

/**
 * Status changes go through a segmented control rather than drag-and-drop:
 * the same capability, a fraction of the code, and it works with a keyboard
 * on a phone.
 */
export function TaskBoard({ tasks, viewerId, canManage, team, projectId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mayMove = (task: ProjectTask) => canManage || task.assignee?.id === viewerId;

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

  function remove(taskId: string) {
    setError(null);
    const data = new FormData();
    data.set("taskId", taskId);
    startTransition(async () => {
      const result = await deleteTask(data);
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
              <h2 className="flex items-baseline gap-2 border-b border-[var(--ink-edge)] pb-2 text-[0.875rem]">
                <span>{STATUS_LABEL[column]}</span>
                <span className="tabular text-[var(--ash)]">{inColumn.length}</span>
              </h2>

              {inColumn.length === 0 ? (
                <p className="py-6 text-[0.875rem] text-[var(--ash)]">Nothing here.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {inColumn.map((task) =>
                    editingId === task.id ? (
                      <li key={task.id}>
                        <TaskForm
                          projectId={projectId}
                          team={team}
                          task={task}
                          onDone={() => setEditingId(null)}
                          onCancel={() => setEditingId(null)}
                        />
                      </li>
                    ) : (
                      <TaskCard
                        key={task.id}
                        task={task}
                        canMove={mayMove(task)}
                        canManage={canManage}
                        onMove={(status) => move(task.id, status)}
                        onEdit={() => setEditingId(task.id)}
                        onDelete={() => remove(task.id)}
                      />
                    ),
                  )}
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
  canManage,
  onMove,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  canMove: boolean;
  canManage: boolean;
  onMove: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const state = dueState(task.dueDate, task.status);
  const high = task.priority === "HIGH" && task.status !== "COMPLETED";

  /*
    Cards are deliberately not uniform. A high-priority task carries more
    weight and a completed one recedes; if every card looked the same, the
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

      {task.description && task.status !== "COMPLETED" && (
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-[var(--ash)]">
          {task.description}
        </p>
      )}

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
              aria-pressed={current}
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
                    : "text-[var(--ash)] opacity-40"
              }`}
            >
              {STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>

      {canManage && (
        <div className={`${rowActions} mt-1.5 text-[0.75rem]`}>
          {confirming ? (
            <>
              {/* Two steps, because deleting a task destroys its history and
                  nothing here can undo it. */}
              <span className="px-2 text-[var(--ash)]">Delete this task?</span>
              <button
                type="button"
                onClick={onDelete}
                className={`${rowAction} text-[var(--ember)] hover:opacity-80`}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${rowAction} text-[var(--ash)] hover:text-[var(--paper)]`}
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className={`${rowAction} text-[var(--ash)] hover:text-[var(--glow)]`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className={`${rowAction} text-[var(--ash)] hover:text-[var(--ember)]`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
