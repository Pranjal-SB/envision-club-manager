import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthenticatedError, authorize } from "@/lib/guard";
import { getProjectDetail, getAllMembers } from "@/lib/queries";
import { ProjectHeader } from "@/components/ProjectHeader";
import { TaskBoard } from "@/components/TaskBoard";
import { TeamPanel } from "@/components/TeamPanel";
import { AddTask } from "@/components/AddTask";

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

  const team = project.team.map((m) => ({ userId: m.userId, name: m.name }));

  return (
    <div className="space-y-12">
      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          deadline: project.deadline,
          progress: project.progress,
        }}
        overdue={overdue}
        canEdit={canManage}
        canDelete={actor.role === "ADMIN"}
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_16rem] lg:gap-14">
        <div className="space-y-8">
          {canManage && <AddTask projectId={project.id} team={team} />}
          <TaskBoard
            tasks={project.tasks}
            viewerId={actor.id}
            canManage={canManage}
            team={team}
            projectId={project.id}
          />
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
