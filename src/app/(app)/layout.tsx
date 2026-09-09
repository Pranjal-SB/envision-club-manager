import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { requireActor, UnauthenticatedError } from "@/lib/guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let actor;
  try {
    actor = await requireActor();
  } catch (error) {
    if (error instanceof UnauthenticatedError) redirect("/login");
    throw error;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { name: true },
  });

  return (
    <div className="min-h-dvh">
      <Nav actor={actor} name={user.name} />
      <main id="main" className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {children}
      </main>
    </div>
  );
}
