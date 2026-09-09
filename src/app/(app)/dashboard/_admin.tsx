import Link from "next/link";
import type { AdminDashboard } from "@/lib/dashboard";
import { countInWords, formatDeadline, pluralise } from "@/lib/format";
import { EmptyState, ProgressBar, SectionHeading } from "@/components/ui";
import { ActivityLine } from "@/components/ActivityLine";

/**
 * The admin view answers "what is the club about to drop", so projects at risk
 * are the hero. Headcount and totals are context and sit in the rail, because
 * nobody has ever acted on a member count.
 */
export function AdminView({ data }: { data: AdminDashboard }) {
  const atRisk = data.atRisk;

  return (
    <div className="space-y-16">
      <section>
        <p className="warm-up mb-3 text-[var(--ash)]">Across the club</p>

        {atRisk.length > 0 ? (
          <h1 className="display warm-up text-[clamp(2rem,5vw,3.25rem)]">
            {countInWords(atRisk.length)} {pluralise(atRisk.length, "project")}{" "}
            <span className="text-[var(--ember)]">
              {atRisk.length === 1 ? "needs" : "need"} attention
            </span>
            .
          </h1>
        ) : (
          <h1 className="display warm-up text-[clamp(2rem,5vw,3.25rem)]">
            Every project is on track.
          </h1>
        )}

        {atRisk.length > 0 && (
          <ul className="warm-up warm-up-delay-1 mt-8">
            {atRisk.map((project) => (
              <li key={project.id} className="border-b border-[var(--ink-edge)] last:border-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="block py-4 transition-colors hover:bg-[var(--ink-lit)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <span className="text-[1.0625rem]">{project.name}</span>
                    {/*
                      Ember means late. A project can be at risk for low
                      progress against a near deadline without anything being
                      overdue yet; colouring that red would make the state
                      system lie, and then nobody trusts the red that matters.
                    */}
                    <span
                      className={`tabular text-[0.8125rem] ${
                        project.overdue > 0 ? "text-[var(--ember)]" : "text-[var(--glow)]"
                      }`}
                    >
                      {project.overdue > 0
                        ? `${project.overdue} ${pluralise(project.overdue, "task")} late`
                        : formatDeadline(project.deadline, "TODO")}
                    </span>
                  </div>
                  <div className="mt-3 max-w-md">
                    <ProgressBar progress={project.progress} label={`${project.name} progress`} />
                  </div>
                  <p className="mt-2 text-[0.8125rem] text-[var(--ash)]">
                    Led by {project.lead?.name ?? "nobody yet"} · {project.memberCount}{" "}
                    {pluralise(project.memberCount, "member")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <section>
          <SectionHeading count={data.projects.length}>All projects</SectionHeading>
          {data.projects.length > 0 ? (
            <ul className="mt-1">
              {data.projects.map((project) => (
                <li key={project.id} className="border-b border-[var(--ink-edge)] last:border-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="grid gap-2 py-4 transition-colors hover:bg-[var(--ink-lit)] sm:grid-cols-[1.3fr_1fr_auto] sm:items-center sm:gap-6"
                  >
                    <div>
                      <p className="text-[1rem]">{project.name}</p>
                      <p className="mt-0.5 text-[0.8125rem] text-[var(--ash)]">
                        {project.lead?.name ?? "No lead assigned"}
                      </p>
                    </div>
                    <ProgressBar progress={project.progress} label={`${project.name} progress`} />
                    <span
                      className={`tabular text-[0.8125rem] sm:text-right ${
                        project.overdue > 0 ? "text-[var(--ember)]" : "text-[var(--ash)]"
                      }`}
                    >
                      {project.overdue > 0
                        ? `${project.overdue} late`
                        : formatDeadline(project.deadline, "TODO")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No projects yet."
              action="Create the first one"
              href="/admin"
            />
          )}
        </section>

        <aside className="space-y-10">
          <section>
            <SectionHeading>The club</SectionHeading>
            <dl className="mt-4 space-y-3 text-[0.9375rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ash)]">Members</dt>
                <dd className="tabular">{data.memberCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ash)]">Tasks late</dt>
                <dd className={`tabular ${data.overdueTotal > 0 ? "text-[var(--ember)]" : ""}`}>
                  {data.overdueTotal}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--ash)]">Without an owner</dt>
                <dd className={`tabular ${data.unassignedTotal > 0 ? "text-[var(--glow)]" : ""}`}>
                  {data.unassignedTotal}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <SectionHeading>Recent activity</SectionHeading>
            {data.activity.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {data.activity.map((entry) => (
                  <ActivityLine key={entry.id} entry={entry} compact />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing has happened yet." />
            )}
            <Link
              href="/activity"
              className="mt-4 inline-block text-[0.875rem] text-[var(--glow)] underline-offset-4 hover:underline"
            >
              All activity
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
