import type { Prisma } from "@/generated/prisma/client";
import type { prisma } from "@/lib/db";

type Db = typeof prisma | Prisma.TransactionClient;

export type AuditEntityType = "Task" | "Project" | "Membership" | "User";

export interface AuditEntry {
  actorId: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  projectId?: string | null;
  meta?: Prisma.InputJsonValue;
}

/**
 * Write an audit row.
 *
 * Always call this inside the same transaction as the mutation it describes.
 * A write that succeeds while its audit entry fails leaves a gap in the record,
 * which is worse than no audit log at all — it looks complete but isn't.
 */
export async function writeAudit(tx: Db, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      projectId: entry.projectId ?? null,
      ...(entry.meta === undefined ? {} : { meta: entry.meta }),
    },
  });
}
