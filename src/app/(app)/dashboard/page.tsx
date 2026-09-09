import { prisma } from "@/lib/db";
import { requireActor } from "@/lib/guard";
import { getDashboard } from "@/lib/dashboard";
import { AdminView } from "./_admin";
import { LeadView } from "./_lead";
import { MemberView } from "./_member";

export const metadata = { title: "Dashboard — Envision" };

/**
 * One route, three structurally different pages. The role does not merely
 * filter the same layout — an admin, a lead, and a member are asking different
 * questions, so they get different pages.
 */
export default async function DashboardPage() {
  const actor = await requireActor();
  const [data, user] = await Promise.all([
    getDashboard(actor),
    prisma.user.findUniqueOrThrow({ where: { id: actor.id }, select: { name: true } }),
  ]);

  if (data.kind === "admin") return <AdminView data={data} />;
  if (data.kind === "lead") return <LeadView data={data} name={user.name} />;
  return <MemberView data={data} name={user.name} />;
}
