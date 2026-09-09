"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { toActionError, type ActionResult } from "@/app/actions/result";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(120),
  description: z.string().trim().max(2000).optional(),
  deadline: z.string().optional(),
  leadId: z.string().min(1).optional(),
});

const membershipSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
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

export async function createProject(formData: FormData): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(fields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }
  const input = parsed.data;

  let newId: string | null = null;

  try {
    const { actor } = await authorize("project.create");

    await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          deadline: parseDate(input.deadline),
        },
      });
      newId = project.id;

      await writeAudit(tx, {
        actorId: actor.id,
        action: "project.created",
        entityType: "Project",
        entityId: project.id,
        projectId: project.id,
        meta: { name: project.name },
      });

      // Assigning a lead *is* creating their membership. Leadership has no
      // meaning separate from belonging to the project.
      if (input.leadId) {
        await tx.membership.create({
          data: { projectId: project.id, userId: input.leadId, role: "LEAD" },
        });
        const lead = await tx.user.findUnique({
          where: { id: input.leadId },
          select: { name: true },
        });
        await writeAudit(tx, {
          actorId: actor.id,
          action: "team.role_changed",
          entityType: "Membership",
          entityId: `${project.id}:${input.leadId}`,
          projectId: project.id,
          meta: { to: "LEAD", user: lead?.name ?? "Someone" },
        });
      }
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  if (newId) redirect(`/projects/${newId}`);
  return {};
}

export async function updateProject(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  if (!projectId || !name) return { error: "Give the project a name." };

  try {
    const { actor } = await authorize("project.update", { projectId });

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          name,
          description: description || null,
          deadline: parseDate(deadline || undefined),
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "project.updated",
        entityType: "Project",
        entityId: projectId,
        projectId,
        meta: { name },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProject(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "No project given." };

  try {
    const { actor } = await authorize("project.delete", { projectId });
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      // Audit first: the row's FK to Project is nullable-by-denormalisation, but
      // the entry must exist even though the project will not.
      await writeAudit(tx, {
        actorId: actor.id,
        action: "project.deleted",
        entityType: "Project",
        entityId: projectId,
        projectId: null,
        meta: { name: project.name },
      });
      await tx.project.delete({ where: { id: projectId } });
    });
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
  redirect("/projects");
}

export async function addProjectMember(formData: FormData): Promise<ActionResult> {
  const parsed = membershipSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: "Pick somebody to add." };
  const { projectId, userId } = parsed.data;

  try {
    const { actor } = await authorize("team.manage", { projectId });

    const existing = await prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { id: true },
    });
    if (existing) return { error: "They are already on this team." };

    const person = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.membership.create({ data: { projectId, userId, role: "MEMBER" } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "team.member_added",
        entityType: "Membership",
        entityId: `${projectId}:${userId}`,
        projectId,
        meta: { user: person.name },
      });
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProjectRole(formData: FormData): Promise<ActionResult> {
  const parsed = membershipSchema
    .extend({ role: z.enum(["LEAD", "MEMBER"]) })
    .safeParse(fields(formData));
  if (!parsed.success) return { error: "That role does not exist." };
  const { projectId, userId, role } = parsed.data;

  try {
    const { actor } = await authorize("team.manage", { projectId });

    const person = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      // One lead per project: promoting somebody demotes the incumbent, rather
      // than leaving two people each believing they are responsible.
      if (role === "LEAD") {
        await tx.membership.updateMany({
          where: { projectId, role: "LEAD" },
          data: { role: "MEMBER" },
        });
      }
      await tx.membership.update({
        where: { projectId_userId: { projectId, userId } },
        data: { role },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "team.role_changed",
        entityType: "Membership",
        entityId: `${projectId}:${userId}`,
        projectId,
        meta: { to: role, user: person.name },
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

export async function removeProjectMember(formData: FormData): Promise<ActionResult> {
  const parsed = membershipSchema.safeParse(fields(formData));
  if (!parsed.success) return { error: "Pick somebody to remove." };
  const { projectId, userId } = parsed.data;

  try {
    const { actor } = await authorize("team.manage", { projectId });

    const person = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      // Their work stays on the board, unassigned, rather than vanishing with
      // them. Somebody still has to do it.
      await tx.task.updateMany({
        where: { projectId, assigneeId: userId },
        data: { assigneeId: null },
      });
      await tx.membership.delete({ where: { projectId_userId: { projectId, userId } } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "team.member_removed",
        entityType: "Membership",
        entityId: `${projectId}:${userId}`,
        projectId,
        meta: { user: person.name },
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

export async function setProjectArchived(formData: FormData): Promise<ActionResult> {
  const projectId = String(formData.get("projectId") ?? "");
  const archived = String(formData.get("archived") ?? "") === "true";
  if (!projectId) return { error: "No project given." };

  try {
    // Archiving is reversible, so a lead may do it to their own project.
    // Deleting is not, and stays admin-only.
    const { actor } = await authorize("project.update", { projectId });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: projectId }, data: { archived } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: archived ? "project.archived" : "project.restored",
        entityType: "Project",
        entityId: projectId,
        projectId,
        meta: { name: project.name },
      });
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
