"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";
import { toActionError, type ActionResult } from "@/app/actions/result";

const BCRYPT_COST = 12;

const createMemberSchema = z.object({
  name: z.string().trim().min(1, "Give the member a name.").max(120),
  email: z.email("That is not a valid email address.").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Passwords must be at least 8 characters."),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  const parsed = createMemberSchema.safeParse(fields(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the member details." };
  }
  const input = parsed.data;

  try {
    const { actor } = await authorize("member.manage");

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) return { error: "Somebody already uses that email address." };

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: bcrypt.hashSync(input.password, BCRYPT_COST),
          role: input.role,
        },
      });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "member.created",
        entityType: "User",
        entityId: user.id,
        meta: { name: user.name, role: user.role },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function setGlobalRole(formData: FormData): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "ADMIN" && role !== "MEMBER")) {
    return { error: "That role does not exist." };
  }

  try {
    const { actor } = await authorize("member.manage");

    // Removing your own admin rights locks you out of this page mid-action.
    if (userId === actor.id && role === "MEMBER") {
      return { error: "You cannot remove your own admin access." };
    }

    // The club must keep at least one admin, or nobody can ever grant the role
    // back and the system is permanently headless.
    if (role === "MEMBER") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) return { error: "The club needs at least one admin." };
    }

    const person = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "member.role_changed",
        entityType: "User",
        entityId: userId,
        meta: { to: role, user: person.name },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/activity");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Pick somebody to remove." };

  try {
    const { actor } = await authorize("member.manage");

    if (userId === actor.id) {
      return { error: "You cannot remove yourself from the club." };
    }

    const person = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });
    if (!person) return { error: "That member no longer exists." };

    // Same reasoning as demotion: the club must keep somebody who can let
    // people back in.
    if (person.role === "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) return { error: "The club needs at least one admin." };
    }

    await prisma.$transaction(async (tx) => {
      // Their memberships cascade and their assigned tasks fall back to
      // unassigned, so the work stays on the board for somebody to pick up.
      // Their audit entries survive with a null actor — see schema.prisma.
      await tx.user.delete({ where: { id: userId } });
      await writeAudit(tx, {
        actorId: actor.id,
        action: "member.removed",
        entityType: "User",
        entityId: userId,
        meta: { user: person.name },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/activity");
    revalidatePath("/projects");
    return {};
  } catch (error) {
    return toActionError(error);
  }
}
