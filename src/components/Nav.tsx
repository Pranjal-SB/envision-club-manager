import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/auth";
import type { Actor } from "@/lib/authz";

/**
 * The admin link is hidden from non-admins for tidiness only. `/admin` is gated
 * in proxy.ts and every action it calls authorizes independently; hiding a link
 * has never been a permission check.
 */
export function Nav({ actor, name }: { actor: Actor; name: string }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/activity", label: "Activity" },
    ...(actor.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-[var(--ink-edge)]">
      {/* First in the tab order, off-screen until focused: without it every
          keyboard user tabs the whole nav again on every page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:m-3 focus:rounded-[3px] focus:bg-[var(--ink-lit)] focus:px-4 focus:py-2.5 focus:text-[var(--paper)]"
      >
        Skip to content
      </a>
      {/*
        Two rows on a phone, one on a laptop. Four link labels plus the identity
        cannot fit 280px of usable width at any honest tap size, so rather than
        let them wrap into three ragged rows the identity rides with the mark and
        the links get a row of their own.
      */}
      <nav
        aria-label="Main"
        className="mx-auto max-w-6xl px-5 py-2 sm:px-8 lg:flex lg:items-center lg:gap-x-4"
      >
        <div className="flex items-center justify-between gap-4">
          {/* The mark alone, not mark-plus-wordmark: at nav size the lockup's
              own type would compete with the interface's. */}
          <Link href="/dashboard" className="mr-2 flex min-h-11 items-center gap-2.5">
            <Image
              src="/brand/envision-mark.png"
              alt=""
              width={220}
              height={316}
              className="h-8 w-auto"
            />
            <span className="display text-[1.125rem] text-[var(--paper)]">Envision</span>
          </Link>

          {/* The name goes first when space runs out: you know who you are, and
              the control is the part you came for. */}
          <div className="flex items-center gap-1 text-[0.875rem] lg:hidden">
            <span className="hidden truncate text-[var(--ash)] sm:inline">{name}</span>
            <SignOut />
          </div>
        </div>

        <ul className="-ml-2.5 flex flex-wrap items-center text-[0.9375rem]">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex min-h-11 items-center rounded-[3px] px-2.5 text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-1 text-[0.875rem] lg:flex">
          <span className="px-2 text-[var(--ash)]">{name}</span>
          <SignOut />
        </div>
      </nav>
    </header>
  );
}

function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="flex min-h-11 items-center rounded-[3px] px-2 whitespace-nowrap text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
      >
        Sign out
      </button>
    </form>
  );
}
