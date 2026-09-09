import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthenticatedError, authorize } from "@/lib/guard";
import { getProjectDetail, getAllMembers } from "@/lib/queries";
import { formatDeadline, pluralise } from "@/lib/format";
import { ProgressBar } from "@/components/ui";
import { TaskBoard } from "@/components/TaskBoard";
import { TeamPanel } from "@/components/TeamPanel";
import { NewTaskForm } from "@/components/NewTaskForm";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // The gate. A non-member reaching this URL directly gets the same 404 as a
  // project that does not exist — existence is itself information.
  let actor;
  try {
    ({ actor } = await authorize("project.view", { projectId: id }));
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect("/login");
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const project = await getProjectDetail(id);
  if (!project) notFound();

  const viewerRole = project.team.find((m) => m.userId === actor.id)?.role ?? null;
  const canManage = actor.role === "ADMIN" || viewerRole === "LEAD";

  const allMembers = canManage ? await getAllMembers() : [];
  const teamIds = new Set(project.team.map((m) => m.userId));
  const addable = allMembers.filter((m) => !teamIds.has(m.id));

  const overdue = project.tasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate !== null && t.dueDate < new Date(),
  ).length;

  return (
    <div className="space-y-12">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)]">{project.name}</h1>
          <span
            className={`tabular text-[0.875rem] ${
              overdue > 0 ? "text-[var(--ember)]" : "text-[var(--ash)]"
            }`}
          >
            {overdue > 0
              ? `${overdue} ${pluralise(overdue, "task")} late`
              : formatDeadline(project.deadline, "TODO")}
          </span>
        </div>

        {project.description && (
          <p className="measure mt-3 text-[var(--ash)]">{project.description}</p>
        )}

        <div className="mt-6 max-w-md">
          <ProgressBar progress={project.progress} label={`${project.name} progress`} />
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_16rem] lg:gap-14">
        <div className="space-y-8">
          {canManage && <NewTaskForm projectId={project.id} team={project.team} />}
          <TaskBoard tasks={project.tasks} viewerId={actor.id} canManage={canManage} />
        </div>

        <TeamPanel
          projectId={project.id}
          team={project.team}
          canManage={canManage}
          addable={addable.map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>
    </div>
  );
}
