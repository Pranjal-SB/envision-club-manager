import Link from "next/link";
import { signOut } from "@/auth";
import type { Actor } from "@/lib/authz";

/**
 * The admin link is hidden from non-admins for tidiness only. `/admin` is gated
 * in proxy.ts and every action it calls authorizes independently — hiding a link
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
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 sm:px-8"
      >
        <Link href="/dashboard" className="display mr-2 text-[1.25rem] text-[var(--paper)]">
          Envision
        </Link>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-4 text-[0.875rem]">
          <span className="text-[var(--ash)]">{name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-[var(--ash)] transition-colors hover:text-[var(--paper)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
