import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type Action, type Actor, type Ctx } from "@/lib/authz";

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have permission to do that.");
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * Resolves the current actor from the database.
 *
 * The role comes from the `users` table on every call, never from the session
 * token. The token is a cache of identity; treating it as a cache of authority
 * means a demoted admin keeps their powers until the cookie expires.
 */
export async function requireActor(): Promise<Actor> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthenticatedError();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!user) throw new UnauthenticatedError();

  return { id: user.id, role: user.role };
}

/**
 * The single entry point for every mutation and every scoped read.
 *
 * Pass `taskId` and the project and assignee are resolved for you, so callers
 * cannot accidentally authorize against a project the task does not belong to.
 */
export async function authorize(
  action: Action,
  opts: { projectId?: string; taskId?: string } = {},
): Promise<{ actor: Actor; projectId?: string }> {
  const actor = await requireActor();
  const ctx: Ctx = {};
  let projectId = opts.projectId;

  if (opts.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: opts.taskId },
      select: { projectId: true, assigneeId: true },
    });
    // A task that does not exist is indistinguishable from one you may not see.
    if (!task) throw new ForbiddenError();
    projectId = task.projectId;
    ctx.task = { assigneeId: task.assigneeId };
  }

  if (projectId) {
    const membership = await prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId: actor.id } },
      select: { role: true },
    });
    ctx.membership = membership?.role ?? null;
  }

  if (!can(actor, action, ctx)) throw new ForbiddenError();

  return { actor, projectId };
}
