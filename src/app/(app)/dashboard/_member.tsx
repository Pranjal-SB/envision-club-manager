import Link from "next/link";
import type { MemberDashboard, MyTask } from "@/lib/dashboard";
import { countInWords, pluralise, STATUS_LABEL } from "@/lib/format";
import { Deadline, EmptyState, Priority, ProgressBar, SectionHeading, StatusDot } from "@/components/ui";

/**
 * The hero is the late work, not a row of statistics. A member opening this
 * page has one real question, what have I let slip, and the page answers it
 * in the first line instead of making them assemble it from four tiles.
 */
export function LateHeadline({ count }: { count: number }) {
  if (count === 0) {
    return (
      <h1 className="display warm-up text-[clamp(2rem,5vw,3.25rem)]">
        Nothing is late.
      </h1>
    );
  }

  return (
    <h1 className="display warm-up text-[clamp(2rem,5vw,3.25rem)]">
      {countInWords(count)} {pluralise(count, "task")}{" "}
      <span className="text-[var(--ember)]">{count === 1 ? "is" : "are"} late</span>.
    </h1>
  );
}

export function TaskLine({ task, showProject = true }: { task: MyTask; showProject?: boolean }) {
  return (
    <li className="group border-b border-[var(--ink-edge)] last:border-0">
      <Link
        href={`/projects/${task.project.id}`}
        className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 transition-colors hover:bg-[var(--ink-lit)]"
      >
        <span className="flex items-center gap-2.5">
          <StatusDot status={task.status} />
          <span
            className={
              task.status === "COMPLETED" ? "text-[var(--ash)] line-through" : "text-[var(--paper)]"
            }
          >
            {task.title}
          </span>
        </span>

        <Priority priority={task.priority} />

        <span className="ml-auto flex items-center gap-4">
          {showProject && (
            <span className="text-[0.8125rem] text-[var(--ash)]">{task.project.name}</span>
          )}
          <Deadline dueDate={task.dueDate} status={task.status} />
        </span>
      </Link>
    </li>
  );
}

export function MemberView({ data, name }: { data: MemberDashboard; name: string }) {
  const inProgress = data.open.filter((t) => t.status === "IN_PROGRESS");
  const todo = data.open.filter((t) => t.status === "TODO");

  return (
    <div className="space-y-16">
      <section>
        <p className="warm-up mb-3 text-[var(--ash)]">{name.split(" ")[0]}&rsquo;s work</p>
        <LateHeadline count={data.late.length} />

        {data.late.length > 0 ? (
          <ul className="warm-up warm-up-delay-1 mt-8 measure">
            {data.late.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        ) : (
          <p className="warm-up warm-up-delay-1 measure mt-6 text-[var(--ash)]">
            {data.open.length > 0
              ? `${data.open.length} ${pluralise(data.open.length, "task")} still open across ${data.projectCount} ${pluralise(data.projectCount, "project")}.`
              : "No open tasks assigned to you."}
          </p>
        )}
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="space-y-12">
          <section>
            <SectionHeading count={inProgress.length}>{STATUS_LABEL.IN_PROGRESS}</SectionHeading>
            {inProgress.length > 0 ? (
              <ul className="mt-1">
                {inProgress.map((task) => (
                  <TaskLine key={task.id} task={task} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing in progress. Pick something up from To do." />
            )}
          </section>

          <section>
            <SectionHeading count={todo.length}>{STATUS_LABEL.TODO}</SectionHeading>
            {todo.length > 0 ? (
              <ul className="mt-1">
                {todo.map((task) => (
                  <TaskLine key={task.id} task={task} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing waiting." />
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <SectionHeading>Your progress</SectionHeading>
            <div className="mt-4 space-y-3">
              <ProgressBar progress={data.progress} label="Your completed tasks" />
              <p className="text-[0.875rem] text-[var(--ash)]">
                {data.progress.completed} of {data.progress.total} finished across{" "}
                {data.projectCount} {pluralise(data.projectCount, "project")}.
              </p>
            </div>
          </section>

          {data.completed.length > 0 && (
            <section>
              <SectionHeading count={data.completed.length}>Recently finished</SectionHeading>
              <ul className="mt-1">
                {data.completed.slice(0, 5).map((task) => (
                  <TaskLine key={task.id} task={task} />
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
