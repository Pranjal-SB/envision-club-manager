import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/authz";
import { progressOf, type Progress, type TaskPriority, type TaskStatus } from "@/lib/format";
import { getActivityFor, getProjectsFor, type ActivityEntry, type ProjectSummary } from "@/lib/queries";

export interface MyTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  project: { id: string; name: string };
}

const myTaskSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  project: { select: { id: true, name: true } },
} as const;

async function getMyTasks(actorId: string): Promise<MyTask[]> {
  return prisma.task.findMany({
    where: { assigneeId: actorId },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 100,
    select: myTaskSelect,
  });
}

function splitByUrgency(tasks: MyTask[], now = new Date()) {
  const open = tasks.filter((t) => t.status !== "COMPLETED");
  return {
    late: open.filter((t) => t.dueDate !== null && t.dueDate < now),
    open,
    completed: tasks.filter((t) => t.status === "COMPLETED"),
  };
}

export interface MemberDashboard {
  kind: "member";
  late: MyTask[];
  open: MyTask[];
  completed: MyTask[];
  progress: Progress;
  projectCount: number;
}

export async function getMemberDashboard(actor: Actor): Promise<MemberDashboard> {
  const [tasks, projectCount] = await Promise.all([
    getMyTasks(actor.id),
    prisma.membership.count({ where: { userId: actor.id } }),
  ]);

  const { late, open, completed } = splitByUrgency(tasks);

  return {
    kind: "member",
    late,
    open,
    completed,
    progress: progressOf({ total: tasks.length, completed: completed.length }),
    projectCount,
  };
}

export interface LeadDashboard extends Omit<MemberDashboard, "kind"> {
  kind: "lead";
  led: ProjectSummary[];
  unassigned: Array<{
    id: string;
    title: string;
    priority: TaskPriority;
    dueDate: Date | null;
    project: { id: string; name: string };
  }>;
}

export async function getLeadDashboard(actor: Actor): Promise<LeadDashboard> {
  const leadMemberships = await prisma.membership.findMany({
    where: { userId: actor.id, role: "LEAD" },
    select: { projectId: true },
  });
  const ledIds = leadMemberships.map((m) => m.projectId);

  const [own, allVisible, unassigned] = await Promise.all([
    getMemberDashboard(actor),
    getProjectsFor(actor),
    // The one queue only a lead can clear.
    prisma.task.findMany({
      where: { projectId: { in: ledIds }, assigneeId: null, status: { not: "COMPLETED" } },
      orderBy: [{ priority: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }],
      take: 25,
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    kind: "lead",
    late: own.late,
    open: own.open,
    completed: own.completed,
    progress: own.progress,
    projectCount: own.projectCount,
    led: allVisible.filter((p) => ledIds.includes(p.id)),
    unassigned,
  };
}

export interface AdminDashboard {
  kind: "admin";
  projects: ProjectSummary[];
  atRisk: ProjectSummary[];
  memberCount: number;
  overdueTotal: number;
  unassignedTotal: number;
  activity: ActivityEntry[];
}

const AT_RISK_PERCENT = 60;

export async function getAdminDashboard(actor: Actor): Promise<AdminDashboard> {
  const [projects, memberCount, unassignedTotal, activity] = await Promise.all([
    getProjectsFor(actor),
    prisma.user.count(),
    prisma.task.count({ where: { assigneeId: null, status: { not: "COMPLETED" } } }),
    getActivityFor(actor),
  ]);

  // At risk means the work is behind, not merely that a deadline exists: either
  // something is already late, or the deadline is close and completion is low.
  const now = Date.now();
  const atRisk = projects.filter((p) => {
    if (p.overdue > 0) return true;
    if (!p.deadline) return false;
    const daysLeft = (p.deadline.getTime() - now) / (24 * 60 * 60 * 1000);
    return daysLeft <= 14 && p.progress.percent < AT_RISK_PERCENT;
  });

  return {
    kind: "admin",
    projects,
    atRisk,
    memberCount,
    overdueTotal: projects.reduce((sum, p) => sum + p.overdue, 0),
    unassignedTotal,
    activity: activity.slice(0, 8),
  };
}

export type Dashboard = MemberDashboard | LeadDashboard | AdminDashboard;

export async function getDashboard(actor: Actor): Promise<Dashboard> {
  if (actor.role === "ADMIN") return getAdminDashboard(actor);

  const leadsSomething = await prisma.membership.count({
    where: { userId: actor.id, role: "LEAD" },
  });

  return leadsSomething > 0 ? getLeadDashboard(actor) : getMemberDashboard(actor);
}
