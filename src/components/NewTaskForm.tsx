"use client";

import { useRef, useState, useTransition } from "react";
import { createTask } from "@/app/actions/tasks";

interface Props {
  projectId: string;
  team: Array<{ userId: string; name: string }>;
}

const field =
  "w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-2.5 py-1.5 text-[0.875rem] text-[var(--paper)] transition-colors hover:border-[var(--ash)]";

export function NewTaskForm({ projectId, team }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[3px] border border-[var(--ink-edge)] px-3 py-2 text-[0.875rem] text-[var(--ash)] transition-colors hover:border-[var(--glow)] hover:text-[var(--glow)]"
      >
        Add a task
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(data) => {
        setError(null);
        data.set("projectId", projectId);
        startTransition(async () => {
          const result = await createTask(data);
          if (result.error) {
            setError(result.error);
            return;
          }
          formRef.current?.reset();
          setOpen(false);
        });
      }}
      className={`space-y-3 rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] p-4 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-[0.8125rem] text-[var(--ash)]">
          Task
        </label>
        <input id="title" name="title" required maxLength={200} autoFocus className={field} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="assigneeId" className="block text-[0.8125rem] text-[var(--ash)]">
            Owner
          </label>
          <select id="assigneeId" name="assigneeId" defaultValue="" className={field}>
            <option value="">Nobody yet</option>
            {team.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="priority" className="block text-[0.8125rem] text-[var(--ash)]">
            Priority
          </label>
          <select id="priority" name="priority" defaultValue="MEDIUM" className={field}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dueDate" className="block text-[0.8125rem] text-[var(--ash)]">
            Due
          </label>
          {/* Native date input: a picker library would be fifty kilobytes to
              reimplement something every browser already ships. */}
          <input id="dueDate" name="dueDate" type="date" className={field} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[0.8125rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[3px] bg-[var(--glow)] px-3 py-1.5 text-[0.875rem] font-medium text-[#17130f] transition-opacity hover:opacity-90"
        >
          Add task
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-[3px] px-3 py-1.5 text-[0.875rem] text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
