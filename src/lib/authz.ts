/**
 * Permission decisions for the whole application.
 *
 * This module is deliberately pure: no database, no session, no imports from
 * anywhere else in the app. Everything it needs is passed in. That makes the
 * permission matrix testable exhaustively without mocks, which matters because
 * a bug here is a vulnerability rather than an inconvenience.
 *
 * Resolving the context (who is the actor, what is their role in this project,
 * who owns this task) is `guard.ts`'s job.
 */

export type GlobalRole = "ADMIN" | "MEMBER";
export type ProjectRole = "LEAD" | "MEMBER";

export type Actor = { id: string; role: GlobalRole };

export type Action =
  | "member.manage"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.view"
  | "team.manage"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "task.updateStatus"
  | "activity.viewAll";

export type Ctx = {
  /** The actor's role in the project under consideration. null means not a member. */
  membership?: ProjectRole | null;
  task?: { assigneeId: string | null };
};

export function can(actor: Actor, action: Action, ctx: Ctx = {}): boolean {
  if (actor.role === "ADMIN") return true;

  const membership = ctx.membership ?? null;
  const isLead = membership === "LEAD";
  const isMember = membership !== null;

  switch (action) {
    // Club-wide authority. Admin only, and admin already returned above.
    case "member.manage":
    case "project.create":
    case "project.delete":
    case "activity.viewAll":
      return false;

    case "project.view":
      return isMember;

    // Running a project: its lead, or an admin.
    case "project.update":
    case "team.manage":
    case "task.create":
    case "task.update":
    case "task.delete":
      return isLead;

    // The narrowest rule in the system. A member may move their own work and
    // nobody else's; an unassigned task has no member who owns it.
    case "task.updateStatus":
      if (isLead) return true;
      if (!isMember) return false;
      return ctx.task?.assigneeId === actor.id;
  }
}
