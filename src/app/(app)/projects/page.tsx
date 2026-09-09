import Link from "next/link";
import { requireActor } from "@/lib/guard";
import { getProjectsFor } from "@/lib/queries";
import { formatDeadline, pluralise } from "@/lib/format";
import { EmptyState, ProgressBar } from "@/components/ui";

export const metadata = { title: "Projects: Envision" };

export default async function ProjectsPage() {
  const actor = await requireActor();
  const [projects, archived] = await Promise.all([
    getProjectsFor(actor),
    getProjectsFor(actor, { archived: true }),
  ]);

  return (
    <div>
      <div className="measure">
        <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)]">Projects</h1>
        <p className="mt-3 text-[var(--ash)]">
          {actor.role === "ADMIN"
            ? "Everything the club is running."
            : "The projects you are part of."}
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="You are not on any projects yet."
          action={actor.role === "ADMIN" ? "Create the first one" : undefined}
          href={actor.role === "ADMIN" ? "/admin" : undefined}
        />
      ) : (
        <ul className="mt-10">
          {projects.map((project) => (
            <li key={project.id} className="border-b border-[var(--ink-edge)] first:border-t">
              <Link
                href={`/projects/${project.id}`}
                className="grid gap-3 py-5 transition-colors hover:bg-[var(--ink-lit)] sm:grid-cols-[1.4fr_1fr_auto] sm:items-center sm:gap-8"
              >
                <div>
                  <p className="flex flex-wrap items-baseline gap-x-3 text-[1.0625rem]">
                    {project.name}
                    {project.viewerRole === "LEAD" && (
                      <span className="text-[0.75rem] text-[var(--glow)]">You lead this</span>
                    )}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-[var(--ash)]">
                    {project.lead ? `Led by ${project.lead.name}` : "No lead assigned"} ·{" "}
                    {project.memberCount} {pluralise(project.memberCount, "member")}
                  </p>
                </div>

                <ProgressBar progress={project.progress} label={`${project.name} progress`} />

                <span
                  className={`tabular text-[0.8125rem] sm:text-right ${
                    project.overdue > 0 ? "text-[var(--ember)]" : "text-[var(--ash)]"
                  }`}
                >
                  {project.overdue > 0
                    ? `${project.overdue} ${pluralise(project.overdue, "task")} late`
                    : formatDeadline(project.deadline, "TODO")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="mt-16">
          <h2 className="border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem] text-[var(--ash)]">
            Archived
          </h2>
          <ul>
            {archived.map((project) => (
              <li key={project.id} className="border-b border-[var(--ink-edge)]">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 text-[var(--ash)] transition-colors hover:bg-[var(--ink-lit)] hover:text-[var(--paper)]"
                >
                  <span>{project.name}</span>
                  <span className="tabular text-[0.8125rem]">
                    {project.progress.completed}/{project.progress.total} done
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
