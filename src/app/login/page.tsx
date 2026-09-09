import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Sign in — Envision" };

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "aditi@envision.club" },
  { role: "Project lead", email: "rohan@envision.club" },
  { role: "Member", email: "arjun@envision.club" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  /*
    Trusting the token alone here causes an infinite redirect loop: if the
    account behind it is gone (removed from the club, or a rebuilt database),
    the app pages bounce to /login while /login bounces back to /dashboard.
    The token is a cache, so verify the account still exists — the same rule
    guard.ts follows.
  */
  const session = await auth();
  if (session?.user?.id) {
    const stillExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (stillExists) redirect("/dashboard");
  }

  const { error, next } = await searchParams;

  async function authenticate(formData: FormData) {
    "use server";
    const target = String(formData.get("next") || "/dashboard");
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: target.startsWith("/") ? target : "/dashboard",
      });
    } catch (err) {
      // NEXT_REDIRECT is how a successful sign-in leaves this function.
      if (err instanceof AuthError) redirect("/login?error=1");
      throw err;
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* The lit half. A dim room with one source, which is the whole idea. */}
      <section className="relative hidden overflow-hidden border-r border-[var(--ink-edge)] lg:block">
        <div
          aria-hidden
          className="absolute -top-52 -left-32 size-[40rem] rounded-full opacity-25 blur-[100px]"
          style={{ background: "radial-gradient(circle, var(--ember), transparent 62%)" }}
        />
        <div
          aria-hidden
          className="absolute -top-24 left-8 size-[22rem] rounded-full opacity-20 blur-[90px]"
          style={{ background: "radial-gradient(circle, var(--glow), transparent 60%)" }}
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          {/* The full lockup earns its space here — this is the one screen
              where the product introduces itself. */}
          {/* self-start matters: this is a column flex container, whose default
              align-items:stretch would pull the logo to the full column width
              and squash the lockup. w-auto alone does not win against stretch. */}
          <Image
            src="/brand/envision-logo.png"
            alt="Team Envision"
            width={1240}
            height={392}
            priority
            className="h-20 w-auto shrink-0 self-start"
          />

          <div>
            <h1 className="display measure text-[clamp(2.25rem,3.6vw,3.25rem)]">
              Everything the club is building, and what is running late.
            </h1>
            <p className="measure mt-6 text-[var(--ash)]">
              Projects, teams, and tasks in one place. Leads run their own projects. Members see the
              work that is theirs.
            </p>
          </div>

          <p className="text-[0.8125rem] text-[var(--ash)]">Aaruush &rsquo;26</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <Image
            src="/brand/envision-logo.png"
            alt="Team Envision"
            width={1240}
            height={392}
            priority
            className="mb-10 h-11 w-auto lg:hidden"
          />

          <h2 className="display text-[1.75rem]">Sign in</h2>

          <form action={authenticate} className="mt-8 space-y-5">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />

            <div className="space-y-2">
              <label htmlFor="email" className="block text-[0.875rem] text-[var(--ash)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                className="w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-3 py-2.5 text-[var(--paper)] transition-colors placeholder:text-[var(--ash)] hover:border-[var(--ash)]"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[0.875rem] text-[var(--ash)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-[3px] border border-[var(--ink-edge)] bg-[var(--ink-lit)] px-3 py-2.5 text-[var(--paper)] transition-colors hover:border-[var(--ash)]"
              />
            </div>

            {error && (
              <p role="alert" className="text-[0.875rem] text-[var(--ember)]">
                Email or password is incorrect.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-[3px] bg-[var(--glow)] px-4 py-2.5 font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </form>

          {/* This is a recruitment submission; a reviewer needs a way in. */}
          <div className="mt-10 border-t border-[var(--ink-edge)] pt-5">
            <p className="text-[0.8125rem] text-[var(--ash)]">
              Demo accounts, password <span className="text-[var(--paper)]">envision2026</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="flex justify-between gap-4 text-[0.8125rem]">
                  <span className="text-[var(--ash)]">{account.role}</span>
                  <span className="text-[var(--paper)]">{account.email}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
