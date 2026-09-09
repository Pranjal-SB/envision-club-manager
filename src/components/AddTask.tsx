"use client";

import { useState } from "react";
import { TaskForm } from "@/components/TaskForm";

/**
 * Just the open/close shell around TaskForm. The form itself is shared with
 * editing, so the fields exist in exactly one place.
 */
export function AddTask({
  projectId,
  team,
}: {
  projectId: string;
  team: Array<{ userId: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);

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
    <TaskForm
      projectId={projectId}
      team={team}
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}
