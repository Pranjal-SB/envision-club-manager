import { requireActor } from "@/lib/guard";
import { getActivityFor } from "@/lib/queries";
import { ActivityLine } from "@/components/ActivityLine";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Activity — Envision" };

function dayLabel(date: Date, now = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(date);
}

export default async function ActivityPage() {
  const actor = await requireActor();
  const entries = await getActivityFor(actor);

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = dayLabel(entry.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return (
    <div className="measure">
      <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)]">Activity</h1>
      <p className="mt-3 text-[var(--ash)]">
        {actor.role === "ADMIN"
          ? "Everything that has happened across the club."
          : "Everything that has happened on your projects."}
      </p>

      {entries.length === 0 ? (
        <EmptyState title="Nothing has happened yet." />
      ) : (
        <div className="mt-10 space-y-10">
          {[...groups.entries()].map(([day, group]) => (
            <section key={day}>
              <h2 className="border-b border-[var(--ink-edge)] pb-2 text-[0.875rem] text-[var(--ash)]">
                {day}
              </h2>
              <ul className="mt-1">
                {group.map((entry) => (
                  <ActivityLine key={entry.id} entry={entry} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
