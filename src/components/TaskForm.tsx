"use client";

import { useRef, useState, useTransition } from "react";
import { createTask, updateTask } from "@/app/actions/tasks";
import { toDateInput, type TaskPriority } from "@/lib/format";
import type { ProjectTask } from "@/lib/queries";

const field =
  "w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink)] px-2.5 py-1.5 text-[0.875rem] text-[var(--paper)] transition-colors hover:border-[var(--ash)]";

const label = "block text-[0.8125rem] text-[var(--ash)]";

interface Props {
  projectId: string;
  team: Array<{ userId: string; name: string }>;
  /** Absent means this form creates a task; present means it edits that one. */
  task?: ProjectTask;
  onDone: () => void;
  onCancel: () => void;
}

/**
 * One form for both creating and editing. The two differ only in which action
 * they call and what they start with — keeping them apart would mean two
 * copies of the same six fields drifting away from each other.
 */
export function TaskForm({ projectId, team, task, onDone, onCancel }: Props) {
  const editing = task !== undefined;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(data) => {
        setError(null);
        if (editing) data.set("taskId", task.id);
        else data.set("projectId", projectId);

        startTransition(async () => {
          const result = editing ? await updateTask(data) : await createTask(data);
          if (result.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          onDone();
        });
      }}
      className={`space-y-3 rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] p-4 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div className="space-y-1.5">
        <label htmlFor={`title-${task?.id ?? "new"}`} className={label}>
          Task
        </label>
        <input
          id={`title-${task?.id ?? "new"}`}
          name="title"
          required
          maxLength={200}
          autoFocus
          defaultValue={task?.title ?? ""}
          className={field}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`desc-${task?.id ?? "new"}`} className={label}>
          Detail <span className="text-[var(--ash)]">— optional</span>
        </label>
        <textarea
          id={`desc-${task?.id ?? "new"}`}
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={task?.description ?? ""}
          placeholder="What does done look like?"
          className={`${field} placeholder:text-[var(--ash)]`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`assignee-${task?.id ?? "new"}`} className={label}>
            Owner
          </label>
          <select
            id={`assignee-${task?.id ?? "new"}`}
            name="assigneeId"
            defaultValue={task?.assignee?.id ?? ""}
            className={field}
          >
            <option value="">Nobody yet</option>
            {team.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`priority-${task?.id ?? "new"}`} className={label}>
            Priority
          </label>
          <select
            id={`priority-${task?.id ?? "new"}`}
            name="priority"
            defaultValue={(task?.priority ?? "MEDIUM") satisfies TaskPriority}
            className={field}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`due-${task?.id ?? "new"}`} className={label}>
            Due
          </label>
          {/* Native date input: a picker library would be fifty kilobytes to
              reimplement something every browser already ships. */}
          <input
            id={`due-${task?.id ?? "new"}`}
            name="dueDate"
            type="date"
            defaultValue={toDateInput(task?.dueDate ?? null)}
            className={field}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[0.8125rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[3px] bg-[var(--glow)] px-3 py-1.5 text-[0.875rem] font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
        >
          {editing ? "Save changes" : "Add task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[3px] px-3 py-1.5 text-[0.875rem] text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
