import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata = {
  title: "Envision — club management",
  description:
    "Members, projects, teams, and tasks for Team Envision. Who is doing what, and what is late.",
};

const ROLES = [
  {
    role: "Admin",
    sees: "Projects at risk",
    why: "Nobody has ever acted on a member count, so headcount sits in the margin and the projects about to slip lead the page.",
  },
  {
    role: "Project lead",
    sees: "Work nobody owns",
    why: "An unassigned task is the one thing only a lead can resolve. Their own assignments come second — they are a member too, but that is not why they opened this.",
  },
  {
    role: "Member",
    sees: "What of theirs is late",
    why: "The only question they came to ask, answered in the first line instead of assembled from four tiles.",
  },
];

export default async function Home() {
  // Anyone already signed in wants the product, not the pitch.
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/envision-mark.png"
            alt=""
            width={220}
            height={316}
            priority
            className="h-8 w-auto"
          />
          <span className="display text-[1.125rem]">Envision</span>
        </div>
        <Link
          href="/login"
          className="rounded-[3px] border border-[var(--ink-edge)] px-4 py-2 text-[0.875rem] text-[var(--ash)] transition-colors hover:border-[var(--glow)] hover:text-[var(--glow)]"
        >
          Sign in
        </Link>
      </header>

      <main>
        {/* Hero. One light source, top left, the way the mark works. */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-64 -left-40 size-[46rem] rounded-full opacity-20 blur-[110px]"
            style={{ background: "radial-gradient(circle, var(--ember), transparent 62%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-24 size-[26rem] rounded-full opacity-[0.18] blur-[100px]"
            style={{ background: "radial-gradient(circle, var(--glow), transparent 60%)" }}
          />

          <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 sm:pb-28">
            <h1 className="display warm-up max-w-[16ch] text-[clamp(2.5rem,7vw,5rem)]">
              Everything the club is building, and what is{" "}
              <span className="text-[var(--ember)]">running late</span>.
            </h1>

            <p className="warm-up warm-up-delay-1 measure mt-8 text-[1.0625rem] text-[var(--ash)]">
              Members, projects, teams, and tasks in one place. Admins run the club, project leads
              run their own projects, and members see the work that is theirs — enforced on the
              server, not hidden in the interface.
            </p>

            <div className="warm-up warm-up-delay-2 mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-[3px] bg-[var(--glow)] px-5 py-2.5 font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
              >
                Open the demo
              </Link>
              <p className="text-[0.875rem] text-[var(--ash)]">
                Three accounts, password{" "}
                <span className="text-[var(--paper)]">envision2026</span>
              </p>
            </div>
          </div>
        </section>

        {/* The argument. Stated once, in the place a reviewer will actually read. */}
        <section className="border-t border-[var(--ink-edge)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            {/* min-w-0 on both children: a grid item defaults to min-width:auto,
                so the <pre> below would size its track to the code's min-content
                and push the whole page wider than a phone. */}
            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
              <div className="min-w-0">
                <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)]">
                  A project lead is not a kind of person.
                </h2>
                <p className="measure mt-6 text-[var(--ash)]">
                  It is a person&rsquo;s standing within one project. The same member can lead the
                  website and be an ordinary contributor on the sponsorship drive, so leadership
                  lives on the membership, not on the user.
                </p>
              </div>

              <div className="min-w-0 self-center">
                <pre className="overflow-x-auto rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] p-5 text-[0.8125rem] leading-relaxed">
                  <code>
                    <span className="text-[var(--paper)]">User.role</span>
                    <span className="text-[var(--ash)]">{"        = ADMIN | MEMBER   "}</span>
                    <span className="text-[var(--ash)]">{"// the club"}</span>
                    {"\n"}
                    <span className="text-[var(--paper)]">Membership.role</span>
                    <span className="text-[var(--ash)]">{"  = LEAD  | MEMBER   "}</span>
                    <span className="text-[var(--ash)]">{"// one project"}</span>
                  </code>
                </pre>
                <p className="mt-4 text-[0.875rem] text-[var(--ash)]">
                  Sign in as <span className="text-[var(--paper)]">rohan@envision.club</span> — he
                  leads one project and follows another.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Three roles, three different pages. */}
        <section className="border-t border-[var(--ink-edge)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)]">
              One route, three different pages.
            </h2>
            <p className="measure mt-6 text-[var(--ash)]">
              The dashboard is not one layout filtered three ways. Each role opens it with a
              different question.
            </p>

            <ul className="mt-12">
              {ROLES.map((entry) => (
                <li
                  key={entry.role}
                  className="grid gap-2 border-t border-[var(--ink-edge)] py-6 last:border-b sm:grid-cols-[10rem_14rem_1fr] sm:gap-8"
                >
                  <p className="text-[var(--ash)]">{entry.role}</p>
                  <p className="text-[var(--paper)]">{entry.sees}</p>
                  <p className="measure text-[0.9375rem] text-[var(--ash)]">{entry.why}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Show the thing itself rather than describing it further. */}
        <section className="border-t border-[var(--ink-edge)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
              <figure>
                <Image
                  src="/brand/preview-dashboard.png"
                  alt="The admin dashboard, leading with the projects that need attention"
                  width={1440}
                  height={920}
                  className="rounded-[3px] border border-[var(--ink-edge)]"
                />
                <figcaption className="mt-3 text-[0.875rem] text-[var(--ash)]">
                  Admin — the projects about to slip, first.
                </figcaption>
              </figure>
              <figure>
                <Image
                  src="/brand/preview-board.png"
                  alt="A project board with tasks in three status columns and the team panel"
                  width={1440}
                  height={920}
                  className="rounded-[3px] border border-[var(--ink-edge)]"
                />
                <figcaption className="mt-3 text-[0.875rem] text-[var(--ash)]">
                  A project — status, owner, deadline, and who may change what.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--ink-edge)]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
            <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)]">
              Have a look around.
            </h2>
            <p className="measure mt-5 text-[var(--ash)]">
              Sign in as an admin, a project lead, and a member. The same links lead to different
              pages, and the server will refuse anything the interface does not offer you.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-block rounded-[3px] bg-[var(--glow)] px-5 py-2.5 font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              Open the demo
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--ink-edge)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-[0.8125rem] text-[var(--ash)] sm:px-8">
          <p>Built for Team Envision · Aaruush &rsquo;26</p>
          <p>Next.js, Postgres, Prisma</p>
        </div>
      </footer>
    </div>
  );
}
