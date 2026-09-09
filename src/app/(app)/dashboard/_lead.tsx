import Link from "next/link";
import type { LeadDashboard } from "@/lib/dashboard";
import { formatDeadline, pluralise, STATUS_LABEL } from "@/lib/format";
import { Deadline, EmptyState, Priority, ProgressBar, SectionHeading } from "@/components/ui";
import { LateHeadline, TaskLine } from "./_member";

/**
 * A lead's dashboard leads with what only a lead can fix: work nobody owns.
 * Their own assigned tasks come second: they are a member too, but that is
 * not why they opened this page.
 */
export function LeadView({ data, name }: { data: LeadDashboard; name: string }) {
  const inProgress = data.open.filter((t) => t.status === "IN_PROGRESS");
  const todo = data.open.filter((t) => t.status === "TODO");
  const ledOverdue = data.led.reduce((sum, p) => sum + p.overdue, 0);

  return (
    <div className="space-y-16">
      <section>
        <p className="warm-up mb-3 text-[var(--ash)]">
          {name.split(" ")[0]} leads {data.led.length} {pluralise(data.led.length, "project")}
        </p>
        <LateHeadline count={ledOverdue} />
        <p className="warm-up warm-up-delay-1 measure mt-6 text-[var(--ash)]">
          {ledOverdue > 0
            ? "Across the projects you run."
            : "Your projects are on schedule."}
        </p>
      </section>

      <section className="warm-up warm-up-delay-2">
        <SectionHeading count={data.led.length}>Projects you lead</SectionHeading>
        <ul className="mt-1">
          {data.led.map((project) => (
            <li key={project.id} className="border-b border-[var(--ink-edge)] last:border-0">
              <Link
                href={`/projects/${project.id}`}
                className="block py-4 transition-colors hover:bg-[var(--ink-lit)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <span className="text-[1.0625rem]">{project.name}</span>
                  <span
                    className={`tabular text-[0.8125rem] ${
                      project.overdue > 0 ? "text-[var(--ember)]" : "text-[var(--ash)]"
                    }`}
                  >
                    {project.overdue > 0
                      ? `${project.overdue} late`
                      : formatDeadline(project.deadline, "TODO")}
                  </span>
                </div>
                <div className="mt-3 max-w-md">
                  <ProgressBar progress={project.progress} label={`${project.name} progress`} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <section>
          <SectionHeading count={data.unassigned.length}>Needs an owner</SectionHeading>
          {data.unassigned.length > 0 ? (
            <ul className="mt-1">
              {data.unassigned.map((task) => (
                <li key={task.id} className="border-b border-[var(--ink-edge)] last:border-0">
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-[var(--ink-lit)]"
                  >
                    <span className="text-[var(--paper)]">{task.title}</span>
                    <Priority priority={task.priority} />
                    <span className="ml-auto flex items-center gap-4">
                      <span className="text-[0.8125rem] text-[var(--ash)]">{task.project.name}</span>
                      <Deadline dueDate={task.dueDate} status="TODO" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Every task has somebody on it." />
          )}
        </section>

        <aside className="space-y-8">
          <section>
            <SectionHeading count={inProgress.length + todo.length}>Your own work</SectionHeading>
            {inProgress.length + todo.length > 0 ? (
              <ul className="mt-1">
                {[...inProgress, ...todo].slice(0, 8).map((task) => (
                  <TaskLine key={task.id} task={task} />
                ))}
              </ul>
            ) : (
              <EmptyState title={`No ${STATUS_LABEL.TODO.toLowerCase()} tasks assigned to you.`} />
            )}
          </section>

          <section>
            <SectionHeading>Your progress</SectionHeading>
            <div className="mt-4">
              <ProgressBar progress={data.progress} label="Your completed tasks" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
