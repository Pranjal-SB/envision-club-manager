import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthenticatedError, authorize } from "@/lib/guard";
import { getAllMembers, getProjectsFor } from "@/lib/queries";
import { pluralise } from "@/lib/format";
import { AdminPanels } from "@/components/AdminPanels";

export const metadata = { title: "Admin — Envision" };

export default async function AdminPage() {
  // Gated here as well as in proxy.ts, and again inside every action this page
  // calls. The nav hiding the link is not one of those gates.
  let actor;
  try {
    ({ actor } = await authorize("member.manage"));
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect("/login");
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [members, projects] = await Promise.all([getAllMembers(), getProjectsFor(actor)]);

  return (
    <div className="space-y-14">
      <header className="measure">
        <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)]">Admin</h1>
        <p className="mt-3 text-[var(--ash)]">
          {members.length} {pluralise(members.length, "member")} across {projects.length}{" "}
          {pluralise(projects.length, "project")}.
        </p>
      </header>

      <AdminPanels
        actorId={actor.id}
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          projectCount: m._count.memberships,
          taskCount: m._count.assignedTasks,
        }))}
      />
    </div>
  );
}
