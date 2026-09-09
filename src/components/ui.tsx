import Link from "next/link";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  dueState,
  formatDeadline,
  type DueState,
  type Progress,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/format";

/*
  The state vocabulary. Every colour in the application is decided here from
  state, never passed in as a prop; that is what stops the palette drifting
  into decoration one component at a time.
*/

const DUE_STYLE: Record<DueState, string> = {
  overdue: "text-[var(--ember)]",
  soon: "text-[var(--glow)]",
  later: "text-[var(--ash)]",
  done: "text-[var(--ash)]",
};

export function Deadline({
  dueDate,
  status,
  className = "",
}: {
  dueDate: Date | null;
  status: TaskStatus;
  className?: string;
}) {
  const state = dueState(dueDate, status);
  return (
    <span className={`tabular text-[0.8125rem] ${DUE_STYLE[state]} ${className}`}>
      {formatDeadline(dueDate, status)}
    </span>
  );
}

/** Priority earns ink only when it is high. Everything cannot be urgent. */
export function Priority({ priority }: { priority: TaskPriority }) {
  if (priority === "MEDIUM") return null;

  const high = priority === "HIGH";
  return (
    <span
      className={`text-[0.75rem] tracking-wide ${high ? "text-[var(--ember)]" : "text-[var(--ash)]"}`}
    >
      {high ? "High priority" : PRIORITY_LABEL[priority]}
    </span>
  );
}

export function StatusDot({ status }: { status: TaskStatus }) {
  const color =
    status === "COMPLETED" ? "var(--ash)" : status === "IN_PROGRESS" ? "var(--glow)" : "var(--ink-edge)";
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

export function ProgressBar({ progress, label }: { progress: Progress; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--ink-edge)]"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Completion"}
      >
        <div
          className="h-full rounded-full bg-[var(--glow)] transition-[width] duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="tabular shrink-0 text-[0.8125rem] text-[var(--ash)]">
        {progress.completed}/{progress.total}
      </span>
    </div>
  );
}

export function Person({ name, muted = false }: { name: string; muted?: boolean }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <span className={`inline-flex items-center gap-2 ${muted ? "text-[var(--ash)]" : ""}`}>
      <span
        aria-hidden
        className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-[var(--ink-edge)] text-[0.6875rem] text-[var(--paper)]"
      >
        {initials}
      </span>
      <span className="text-[0.875rem]">{name}</span>
    </span>
  );
}

export function Unassigned() {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--glow)]">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed border-[var(--glow)] text-[0.6875rem]"
      >
        ?
      </span>
      <span className="text-[0.875rem]">Needs an owner</span>
    </span>
  );
}

/** An empty screen is an invitation to act, not a shrug. */
export function EmptyState({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="border-t border-[var(--ink-edge)] py-10">
      <p className="text-[var(--ash)]">{title}</p>
      {action && href && (
        <Link
          href={href}
          className="mt-2 inline-block text-[var(--glow)] underline-offset-4 hover:underline"
        >
          {action}
        </Link>
      )}
    </div>
  );
}

export function SectionHeading({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="flex items-baseline gap-3 border-b border-[var(--ink-edge)] pb-2 text-[0.9375rem] text-[var(--paper)]">
      {children}
      {count !== undefined && <span className="tabular text-[var(--ash)]">{count}</span>}
    </h2>
  );
}

export { STATUS_LABEL };
