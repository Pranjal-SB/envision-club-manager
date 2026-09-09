"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { toActionError, type ActionResult } from "@/app/actions/result";

const statusSchema = z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]);
const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

const setStatusSchema = z.object({
  taskId: z.string().min(1),
  status: statusSchema,
});

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Give the task a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.string().min(1).optional(),
  priority: prioritySchema.default("MEDIUM"),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  assigneeId: z.string().optional(),
  priority: prioritySchema,
  dueDate: z.string().optional(),
});

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}

export async function setTaskStatus(formData: FormData): Promise<ActionResult> {
  const parsed = setStatusSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: "That status does not exist." };
  const { taskId, status } = parsed.data;

  try {
    // Authorization first, always. Passing taskId lets the guard resolve both
    // the project and the assignee, so the caller cannot mismatch them.
    const { actor, projectId } = await authorize("task.updateStatus", { taskId });

    const before = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { status: true, title: true },
    });
    if (before.status === status) return {};

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "task.status_changed",
        entityType: "Task",
        entityId: taskId,
        projectId,
        meta: { from: before.status, to: status, title: before.title },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(fields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the task details." };
  }
  const input = parsed.data;

  try {
    const { actor } = await authorize("task.create", { projectId: input.projectId });

    // An assignee must already be on the team; otherwise a task could be pushed
    // onto somebody who cannot even see the project.
    if (input.assigneeId) {
      const member = await prisma.membership.findUnique({
        where: { projectId_userId: { projectId: input.projectId, userId: input.assigneeId } },
        select: { id: true },
      });
      if (!member) return { error: "That person is not on this project's team." };
    }

    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: input.description ?? null,
          assigneeId: input.assigneeId ?? null,
          priority: input.priority,
          dueDate: parseDate(input.dueDate),
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "task.created",
        entityType: "Task",
        entityId: task.id,
        projectId: input.projectId,
        meta: { title: task.title },
      });
    });

    revalidatePath(`/projects/${input.projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTask(formData: FormData): Promise<ActionResult> {
  const parsed = updateTaskSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: "Check the task details." };
  const input = parsed.data;

  try {
    const { actor, projectId } = await authorize("task.update", { taskId: input.taskId });

    if (input.assigneeId && projectId) {
      const member = await prisma.membership.findUnique({
        where: { projectId_userId: { projectId, userId: input.assigneeId } },
        select: { id: true },
      });
      if (!member) return { error: "That person is not on this project's team." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: input.taskId },
        data: {
          title: input.title,
          assigneeId: input.assigneeId ?? null,
          priority: input.priority,
          dueDate: parseDate(input.dueDate),
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "task.updated",
        entityType: "Task",
        entityId: input.taskId,
        projectId,
        meta: { title: input.title },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTask(formData: FormData): Promise<ActionResult> {
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return { error: "No task given." };

  try {
    const { actor, projectId } = await authorize("task.delete", { taskId });

    const task = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { title: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: taskId } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "task.deleted",
        entityType: "Task",
        entityId: taskId,
        projectId,
        meta: { title: task.title },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
