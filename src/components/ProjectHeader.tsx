"use client";

import { useRef, useState, useTransition } from "react";
import { deleteProject, setProjectArchived, updateProject } from "@/app/actions/projects";
import { ProgressBar } from "@/components/ui";
import { formatDeadline, pluralise, toDateInput, type Progress } from "@/lib/format";

const field =
  "w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink)] px-2.5 py-2 text-[0.9375rem] text-[var(--paper)] transition-colors hover:border-[var(--ash)]";

interface Props {
  project: {
    id: string;
    name: string;
    description: string | null;
    deadline: Date | null;
    progress: Progress;
    archived: boolean;
  };
  overdue: number;
  canEdit: boolean;
  /** Deleting a project is admin-only; a lead may edit but not destroy. */
  canDelete: boolean;
}

export function ProjectHeader({ project, overdue, canEdit, canDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function setArchived(archived: boolean) {
    setError(null);
    const data = new FormData();
    data.set("projectId", project.id);
    data.set("archived", String(archived));
    startTransition(async () => {
      const result = await setProjectArchived(data);
      if (result.error) setError(result.error);
    });
  }

  function destroy() {
    setError(null);
    const data = new FormData();
    data.set("projectId", project.id);
    startTransition(async () => {
      // On success this redirects, so only a failure returns here.
      const result = await deleteProject(data);
      if (result?.error) setError(result.error);
    });
  }

  if (editing) {
    return (
      <header className={pending ? "opacity-70" : undefined}>
        <form
          ref={formRef}
          action={(data) => {
            setError(null);
            data.set("projectId", project.id);
            startTransition(async () => {
              const result = await updateProject(data);
              if (result.error) {
                setError(result.error);
                return;
              }
              setEditing(false);
            });
          }}
          className="space-y-4 rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] p-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="block text-[0.8125rem] text-[var(--ash)]">
              Name
            </label>
            <input
              id="project-name"
              name="name"
              required
              maxLength={120}
              autoFocus
              defaultValue={project.name}
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div className="space-y-1.5">
              <label htmlFor="project-desc" className="block text-[0.8125rem] text-[var(--ash)]">
                What is it for
              </label>
              <textarea
                id="project-desc"
                name="description"
                rows={2}
                defaultValue={project.description ?? ""}
                className={field}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="project-deadline" className="block text-[0.8125rem] text-[var(--ash)]">
                Deadline
              </label>
              <input
                id="project-deadline"
                name="deadline"
                type="date"
                defaultValue={toDateInput(project.deadline)}
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
              Save changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-[3px] px-3 py-1.5 text-[0.875rem] text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </header>
    );
  }

  return (
    <header className={pending ? "opacity-70" : undefined}>
      {project.archived && (
        <p className="mb-3 inline-block rounded-[3px] border border-[var(--ink-edge)] px-2 py-1 text-[0.8125rem] text-[var(--ash)]">
          Archived: kept for the record, out of the active list
        </p>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)]">{project.name}</h1>
        <span
          className={`tabular text-[0.875rem] ${
            overdue > 0 ? "text-[var(--ember)]" : "text-[var(--ash)]"
          }`}
        >
          {overdue > 0
            ? `${overdue} ${pluralise(overdue, "task")} late`
            : formatDeadline(project.deadline, "TODO")}
        </span>
      </div>

      {project.description && (
        <p className="measure mt-3 text-[var(--ash)]">{project.description}</p>
      )}

      <div className="mt-6 max-w-md">
        <ProgressBar progress={project.progress} label={`${project.name} progress`} />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[0.875rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      {(canEdit || canDelete) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 text-[0.8125rem]">
          {confirming ? (
            <>
              {/* Deleting a project takes its tasks and its history with it. */}
              <span className="text-[var(--ash)]">
                Delete {project.name} and all {project.progress.total}{" "}
                {pluralise(project.progress.total, "task")}?
              </span>
              <button
                type="button"
                onClick={destroy}
                className="text-[var(--ember)] transition-opacity hover:opacity-80"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
              >
                Keep
              </button>
            </>
          ) : (
            <>
              {canEdit && !project.archived && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[var(--ash)] transition-colors hover:text-[var(--glow)]"
                >
                  Edit project
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setArchived(!project.archived)}
                  className="text-[var(--ash)] transition-colors hover:text-[var(--glow)]"
                >
                  {project.archived ? "Restore project" : "Archive project"}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="text-[var(--ash)] transition-colors hover:text-[var(--ember)]"
                >
                  Delete project
                </button>
              )}
            </>
          )}
        </div>
      )}
    </header>
  );
}
