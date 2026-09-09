"use client";

import { useRef, useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";
import { createMember, setGlobalRole } from "@/app/actions/members";
import { Person } from "@/components/ui";
import { pluralise } from "@/lib/format";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  projectCount: number;
  taskCount: number;
}

const field =
  "w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-2.5 py-2 text-[0.875rem] text-[var(--paper)] transition-colors hover:border-[var(--ash)]";

export function AdminPanels({ actorId, members }: { actorId: string; members: Member[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const projectForm = useRef<HTMLFormElement>(null);
  const memberForm = useRef<HTMLFormElement>(null);

  function submit(
    action: (data: FormData) => Promise<{ error?: string }>,
    data: FormData,
    form?: HTMLFormElement | null,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      form?.reset();
    });
  }

  return (
    <div className={`space-y-14 ${pending ? "opacity-70" : ""}`}>
      {error && (
        <p role="alert" className="text-[0.875rem] text-[var(--ember)]">
          {error}
        </p>
      )}

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section>
          <h2 className="border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem]">New project</h2>
          <form
            ref={projectForm}
            action={(data) => submit(createProject, data, projectForm.current)}
            className="mt-5 space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="p-name" className="block text-[0.8125rem] text-[var(--ash)]">
                Name
              </label>
              <input id="p-name" name="name" required maxLength={120} className={field} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="p-desc" className="block text-[0.8125rem] text-[var(--ash)]">
                What is it for
              </label>
              <textarea id="p-desc" name="description" rows={2} className={field} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="p-deadline" className="block text-[0.8125rem] text-[var(--ash)]">
                  Deadline
                </label>
                <input id="p-deadline" name="deadline" type="date" className={field} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="p-lead" className="block text-[0.8125rem] text-[var(--ash)]">
                  Project lead
                </label>
                <select id="p-lead" name="leadId" defaultValue="" className={field}>
                  <option value="">Decide later</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-[3px] bg-[var(--glow)] px-4 py-2 text-[0.875rem] font-medium text-[#17130f] transition-opacity hover:opacity-90"
            >
              Create project
            </button>
          </form>
        </section>

        <section>
          <h2 className="border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem]">New member</h2>
          <form
            ref={memberForm}
            action={(data) => submit(createMember, data, memberForm.current)}
            className="mt-5 space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="m-name" className="block text-[0.8125rem] text-[var(--ash)]">
                Name
              </label>
              <input id="m-name" name="name" required maxLength={120} className={field} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="m-email" className="block text-[0.8125rem] text-[var(--ash)]">
                Email
              </label>
              <input id="m-email" name="email" type="email" required className={field} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="m-password" className="block text-[0.8125rem] text-[var(--ash)]">
                  Temporary password
                </label>
                <input
                  id="m-password"
                  name="password"
                  type="text"
                  required
                  minLength={8}
                  className={field}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="m-role" className="block text-[0.8125rem] text-[var(--ash)]">
                  Access
                </label>
                <select id="m-role" name="role" defaultValue="MEMBER" className={field}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-[3px] border border-[var(--ink-edge)] px-4 py-2 text-[0.875rem] text-[var(--ash)] transition-colors hover:border-[var(--glow)] hover:text-[var(--glow)]"
            >
              Add member
            </button>
          </form>
        </section>
      </div>

      <section>
        <h2 className="flex items-baseline gap-2 border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem]">
          Members <span className="tabular text-[var(--ash)]">{members.length}</span>
        </h2>

        <ul className="mt-1">
          {members.map((member) => (
            <li
              key={member.id}
              className="grid gap-2 border-b border-[var(--ink-edge)] py-4 last:border-0 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:gap-6"
            >
              <div>
                <Person name={member.name} />
                <p className="mt-1 ml-8 text-[0.8125rem] text-[var(--ash)]">{member.email}</p>
              </div>

              <p className="text-[0.8125rem] text-[var(--ash)] sm:ml-0 ml-8">
                {member.projectCount} {pluralise(member.projectCount, "project")} ·{" "}
                {member.taskCount} {pluralise(member.taskCount, "task")}
              </p>

              <div className="ml-8 sm:ml-0 sm:justify-self-end">
                {member.id === actorId ? (
                  <span className="text-[0.8125rem] text-[var(--ash)]">You · Admin</span>
                ) : (
                  <select
                    aria-label={`Access for ${member.name}`}
                    value={member.role}
                    onChange={(event) => {
                      const data = new FormData();
                      data.set("userId", member.id);
                      data.set("role", event.target.value);
                      submit(setGlobalRole, data);
                    }}
                    className="rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-2 py-1 text-[0.8125rem] text-[var(--paper)]"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
