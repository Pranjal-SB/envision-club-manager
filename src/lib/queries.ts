import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/authz";
import { progressOf, type Progress, type TaskPriority, type TaskStatus } from "@/lib/format";

const LIST_LIMIT = 200;
const ACTIVITY_LIMIT = 60;

/**
 * Scoping — which rows an actor may see — is a query concern and lives here.
 * Authorization — what an actor may do — is `can()`'s job. Keeping them apart
 * stops "can they see it" and "may they change it" from drifting into one
 * blurred check.
 */
const visibleProjects = (actor: Actor) =>
  actor.role === "ADMIN" ? {} : { memberships: { some: { userId: actor.id } } };

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  deadline: Date | null;
  lead: { id: string; name: string } | null;
  memberCount: number;
  overdue: number;
  progress: Progress;
  viewerRole: "LEAD" | "MEMBER" | null;
}

export async function getProjectsFor(actor: Actor): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: { archived: false, ...visibleProjects(actor) },
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: LIST_LIMIT,
    select: {
      id: true,
      name: true,
      description: true,
      deadline: true,
      memberships: { select: { role: true, user: { select: { id: true, name: true } } } },
      tasks: { select: { status: true, dueDate: true } },
    },
  });

  const now = new Date();

  return projects.map((p) => {
    const lead = p.memberships.find((m) => m.role === "LEAD")?.user ?? null;
    const completed = p.tasks.filter((t) => t.status === "COMPLETED").length;
    const overdue = p.tasks.filter(
      (t) => t.status !== "COMPLETED" && t.dueDate !== null && t.dueDate < now,
    ).length;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      deadline: p.deadline,
      lead,
      memberCount: p.memberships.length,
      overdue,
      progress: progressOf({ total: p.tasks.length, completed }),
      viewerRole: p.memberships.find((m) => m.user.id === actor.id)?.role ?? null,
    };
  });
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  assignee: { id: string; name: string } | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  deadline: Date | null;
  progress: Progress;
  viewerRole: "LEAD" | "MEMBER" | null;
  team: Array<{ id: string; userId: string; name: string; email: string; role: "LEAD" | "MEMBER" }>;
  tasks: ProjectTask[];
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      deadline: true,
      memberships: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: {
          id: true,
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tasks: {
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        take: LIST_LIMIT,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!project) return null;

  const completed = project.tasks.filter((t) => t.status === "COMPLETED").length;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    deadline: project.deadline,
    progress: progressOf({ total: project.tasks.length, completed }),
    viewerRole: null,
    team: project.memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
    tasks: project.tasks,
  };
}

export interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date;
  actor: { id: string; name: string };
  projectName: string | null;
  meta: Record<string, unknown> | null;
}

export async function getActivityFor(actor: Actor): Promise<ActivityEntry[]> {
  // Non-admins see their own projects' history and nothing else. Entries with no
  // project (club-level member changes) are admin-only by construction.
  const scope =
    actor.role === "ADMIN"
      ? {}
      : {
          projectId: {
            in: (
              await prisma.membership.findMany({
                where: { userId: actor.id },
                select: { projectId: true },
              })
            ).map((m) => m.projectId),
          },
        };

  const entries = await prisma.auditLog.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      id: true,
      action: true,
      entityType: true,
      createdAt: true,
      meta: true,
      projectId: true,
      actor: { select: { id: true, name: true } },
    },
  });

  const projectIds = [...new Set(entries.map((e) => e.projectId).filter((v): v is string => !!v))];
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(projects.map((p) => [p.id, p.name]));

  return entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    createdAt: e.createdAt,
    actor: e.actor,
    projectName: e.projectId ? (nameById.get(e.projectId) ?? null) : null,
    meta: (e.meta as Record<string, unknown> | null) ?? null,
  }));
}

export async function getAllMembers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { memberships: true, assignedTasks: true } },
    },
  });
}
