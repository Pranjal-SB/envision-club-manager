"use client";

import { useState, useTransition } from "react";
import { addProjectMember, removeProjectMember, setProjectRole } from "@/app/actions/projects";
import { Person } from "@/components/ui";

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "LEAD" | "MEMBER";
}

interface Props {
  projectId: string;
  team: TeamMember[];
  canManage: boolean;
  addable: Array<{ id: string; name: string }>;
}

export function TeamPanel({ projectId, team, canManage, addable }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (data: FormData) => Promise<{ error?: string }>, entries: Record<string, string>) {
    setError(null);
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    startTransition(async () => {
      const result = await action(data);
      if (result.error) setError(result.error);
    });
  }

  return (
    <aside className={pending ? "opacity-70" : undefined}>
      <h2 className="flex items-baseline gap-2 border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem]">
        Team <span className="tabular text-[var(--ash)]">{team.length}</span>
      </h2>

      {error && (
        <p role="alert" className="mt-3 text-[0.8125rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {team.map((member) => (
          <li key={member.id}>
            <div className="flex items-center justify-between gap-3">
              <Person name={member.name} />
              {member.role === "LEAD" && (
                <span className="text-[0.75rem] text-[var(--glow)]">Lead</span>
              )}
            </div>

            {canManage && (
              <div className="mt-1.5 ml-8 flex flex-wrap gap-x-3 text-[0.75rem]">
                {member.role === "MEMBER" && (
                  <button
                    type="button"
                    onClick={() =>
                      run(setProjectRole, { projectId, userId: member.userId, role: "LEAD" })
                    }
                    className="text-[var(--ash)] transition-colors hover:text-[var(--glow)]"
                  >
                    Make lead
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => run(removeProjectMember, { projectId, userId: member.userId })}
                  className="text-[var(--ash)] transition-colors hover:text-[var(--ember)]"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canManage && addable.length > 0 && (
        <form
          className="mt-8 space-y-2 border-t border-[var(--ink-edge)] pt-5"
          action={(data) => {
            data.set("projectId", projectId);
            run(addProjectMember, {
              projectId,
              userId: String(data.get("userId") ?? ""),
            });
          }}
        >
          <label htmlFor="add-member" className="block text-[0.8125rem] text-[var(--ash)]">
            Add somebody
          </label>
          <div className="flex gap-2">
            <select
              id="add-member"
              name="userId"
              required
              defaultValue=""
              className="min-w-0 flex-1 rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-2 py-1.5 text-[0.875rem] text-[var(--paper)]"
            >
              <option value="" disabled>
                Choose a member
              </option>
              {addable.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-[3px] border border-[var(--ink-edge)] px-3 py-1.5 text-[0.875rem] text-[var(--ash)] transition-colors hover:border-[var(--ash)] hover:text-[var(--paper)]"
            >
              Add
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
