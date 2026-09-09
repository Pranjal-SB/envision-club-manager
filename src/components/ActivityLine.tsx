import type { ActivityEntry } from "@/lib/queries";
import { STATUS_LABEL, formatRelative, type TaskStatus } from "@/lib/format";

const isStatus = (v: unknown): v is TaskStatus =>
  v === "TODO" || v === "IN_PROGRESS" || v === "COMPLETED";

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/**
 * Audit rows are stored as an action plus loose metadata. They are read as
 * English — "Priya moved Draft sponsor deck to In progress" — because a log
 * nobody can skim is a log nobody checks.
 */
function describe(entry: ActivityEntry): React.ReactNode {
  const meta = entry.meta ?? {};
  const title = str(meta.title);
  const user = str(meta.user);
  const name = str(meta.name);
  const to = meta.to;

  const subject = (text: string) => <span className="text-[var(--paper)]">{text}</span>;

  switch (entry.action) {
    case "task.status_changed":
      return (
        <>
          moved {subject(title ?? "a task")} to{" "}
          {subject(isStatus(to) ? STATUS_LABEL[to] : String(to ?? "another status"))}
        </>
      );
    case "task.created":
      return <>added {subject(title ?? "a task")}</>;
    case "task.updated":
      return <>edited {subject(title ?? "a task")}</>;
    case "task.deleted":
      return <>deleted {subject(title ?? "a task")}</>;
    case "project.created":
      return <>created {subject(name ?? entry.projectName ?? "a project")}</>;
    case "project.updated":
      return <>updated {subject(name ?? entry.projectName ?? "a project")}</>;
    case "project.deleted":
      return <>deleted {subject(name ?? "a project")}</>;
    case "team.member_added":
      return <>added {subject(user ?? "somebody")} to the team</>;
    case "team.member_removed":
      return <>removed {subject(user ?? "somebody")} from the team</>;
    case "team.role_changed":
      return to === "LEAD" ? (
        <>made {subject(user ?? "somebody")} the project lead</>
      ) : (
        <>moved {subject(user ?? "somebody")} back to member</>
      );
    case "member.created":
      return <>added {subject(name ?? "a new member")} to the club</>;
    case "member.role_changed":
      return to === "ADMIN" ? (
        <>made {subject(user ?? "somebody")} an admin</>
      ) : (
        <>removed admin access from {subject(user ?? "somebody")}</>
      );
    default:
      return <>{entry.action}</>;
  }
}

export function ActivityLine({ entry, compact = false }: { entry: ActivityEntry; compact?: boolean }) {
  return (
    <li className={compact ? "text-[0.875rem]" : "border-b border-[var(--ink-edge)] py-3 last:border-0"}>
      <p className="text-[var(--ash)]">
        <span className="text-[var(--paper)]">{entry.actor.name}</span> {describe(entry)}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-[var(--ash)]">
        <span className="tabular">{formatRelative(entry.createdAt)}</span>
        {entry.projectName && (
          <>
            <span aria-hidden>·</span>
            <span>{entry.projectName}</span>
          </>
        )}
      </p>
    </li>
  );
}
