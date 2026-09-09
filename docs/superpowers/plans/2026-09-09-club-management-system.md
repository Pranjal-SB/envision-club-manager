# Club Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A role-based club management system — members, projects, teams, tasks — with server-enforced permissions, three genuinely different dashboards, and a public URL.

**Architecture:** One Next.js 15 App Router application. All mutations are server actions; every one of them resolves permission context from the database and calls a pure `can()` decision function before touching data. Project Lead is a per-project membership role, not a global user role. Audit entries are written in the same transaction as the mutation they describe.

**Tech Stack:** Next.js 15, TypeScript, Prisma 6, Postgres (Neon), Auth.js v5 (Credentials, JWT strategy), bcryptjs, Tailwind CSS 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-club-management-system-design.md`

## Global Constraints

- Node 20+. Next.js 15 App Router only — no `pages/` directory.
- `passwordHash` is never selected into any object that reaches a client component.
- Every server action's first two statements: resolve the session, then `authorize(...)`. No exceptions, including read-only actions.
- Auth.js Credentials provider **requires** `session: { strategy: "jwt" }`. It throws `UnsupportedStrategy` otherwise. No Prisma adapter, no `Session`/`Account` tables.
- The JWT carries `userId` only. Global role and project membership are read from the database on every authorization decision — never from token claims.
- No hardcoded colour values in components. All colour comes from CSS custom properties defined in `app/globals.css`.
- No secrets in the repository. `.env` is gitignored; `.env.example` documents every variable.
- Task statuses are exactly `TODO`, `IN_PROGRESS`, `COMPLETED`. Priorities are exactly `LOW`, `MEDIUM`, `HIGH`.
- Interface copy is sentence case. No ALL-CAPS eyebrow labels, no `→` appended to button text.

---

## Design tokens (referenced by every UI task)

Concept: **light is attention.** Overdue work burns, active work glows, completed work goes dark. Colour is never decorative.

| Token | Value | Meaning |
|---|---|---|
| `--ink` | `#17130F` | Page ground — warm, real chroma |
| `--ink-lit` | `#231C15` | Raised surface |
| `--ink-edge` | `#332A20` | Hairline separation |
| `--glow` | `#F5A524` | In progress, due soon, progress fill |
| `--ember` | `#E0523A` | Overdue, high priority |
| `--paper` | `#EDE6DA` | Primary text |
| `--ash` | `#8A8078` | Completed, metadata, secondary text |

Type: `Fraunces` (display serif, variable) and `Archivo` (UI sans, tabular figures), both via `next/font/google`.

Type scale (rem): 0.8125, 0.9375, 1, 1.25, 1.75, 2.5, 4. Body line length capped at 72ch.

---

## File structure

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` | Data model |
| `prisma/seed.ts` | Demo data for the README and video |
| `src/lib/authz.ts` | Pure permission decisions. No I/O. |
| `src/lib/authz.test.ts` | The permission matrix |
| `src/lib/guard.ts` | Resolves session + DB context, calls `can()`, throws on denial |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/audit.ts` | `writeAudit()` helper, transaction-aware |
| `src/lib/queries.ts` | Read paths for dashboards and lists |
| `src/lib/format.ts` | Date/deadline/progress presentation helpers |
| `src/auth.ts` | Auth.js configuration |
| `src/middleware.ts` | Route gating (convenience layer, not the boundary) |
| `src/app/globals.css` | Design tokens, base typography |
| `src/app/layout.tsx` | Fonts, shell |
| `src/app/login/page.tsx` | Credentials form |
| `src/app/(app)/dashboard/page.tsx` | Role branch |
| `src/app/(app)/dashboard/_admin.tsx` `_lead.tsx` `_member.tsx` | The three dashboards |
| `src/app/(app)/projects/page.tsx` | Project list |
| `src/app/(app)/projects/[id]/page.tsx` | Board, team panel, project activity |
| `src/app/(app)/admin/page.tsx` | Members, project creation, lead assignment |
| `src/app/(app)/activity/page.tsx` | Audit log |
| `src/app/actions/projects.ts` `tasks.ts` `members.ts` | Server actions |
| `src/components/` | Presentational components only — no permission logic |

**Note on a refinement to the spec:** the spec describes `can()` as reading the database. Splitting that into a pure `can()` plus a DB-resolving `guard.ts` keeps the same security property — decisions still use fresh database state, never token claims — while making the permission matrix testable without mocks. This is the only structural deviation from the spec.

---

### Task 1: Project scaffold, schema, and database

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `prisma/schema.prisma`, `src/lib/db.ts`, `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `prisma` client with models `User`, `Project`, `Membership`, `Task`, `AuditLog`; `src/lib/db.ts` default-exports `prisma`

- [ ] **Step 1: Scaffold the app**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
npm i prisma @prisma/client next-auth@beta bcryptjs
npm i -D vitest @types/bcryptjs tsx
```

- [ ] **Step 2: Write the Prisma schema**

`prisma/schema.prisma` — copy the full schema from the spec's "Data model" section verbatim, with this generator/datasource block:

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
```

- [ ] **Step 3: Create the Neon database and push the schema**

Create a project at neon.tech, copy the pooled connection string into `.env` as `DATABASE_URL`.

Run: `npx prisma db push && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Write the client singleton**

```ts
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
```

- [ ] **Step 5: Document environment variables**

```bash
# .env.example
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
AUTH_SECRET="generate with: npx auth secret"
AUTH_URL="http://localhost:3000"
```

- [ ] **Step 6: Verify and commit**

Run: `npx prisma studio` — confirm all five tables exist, then close.

```bash
git add -A && git commit -m "feat: scaffold app with prisma schema and neon database"
```

---

### Task 2: Permission matrix (pure, tested)

**Files:**
- Create: `src/lib/authz.ts`, `src/lib/authz.test.ts`, `vitest.config.ts`

**Interfaces:**
- Consumes: nothing (deliberately — this file performs no I/O)
- Produces:
  - `type Actor = { id: string; role: "ADMIN" | "MEMBER" }`
  - `type Action` — the union listed in Step 2 below
  - `type Ctx = { membership?: "LEAD" | "MEMBER" | null; task?: { assigneeId: string | null } }`
  - `can(actor: Actor, action: Action, ctx?: Ctx): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/authz.test.ts
import { describe, it, expect } from "vitest";
import { can, type Actor } from "./authz";

const admin: Actor = { id: "u-admin", role: "ADMIN" };
const lead: Actor = { id: "u-lead", role: "MEMBER" };
const member: Actor = { id: "u-member", role: "MEMBER" };
const outsider: Actor = { id: "u-outsider", role: "MEMBER" };

const asLead = { membership: "LEAD" } as const;
const asMember = { membership: "MEMBER" } as const;
const asOutsider = { membership: null } as const;

describe("admin", () => {
  it("manages club members", () => expect(can(admin, "member.manage")).toBe(true));
  it("creates and deletes projects", () => {
    expect(can(admin, "project.create")).toBe(true);
    expect(can(admin, "project.delete", asOutsider)).toBe(true);
  });
  it("sees club-wide activity", () => expect(can(admin, "activity.viewAll")).toBe(true));
  it("acts on projects it is not a member of", () => {
    expect(can(admin, "task.create", asOutsider)).toBe(true);
    expect(can(admin, "project.view", asOutsider)).toBe(true);
  });
});

describe("project lead", () => {
  it("manages the team and tasks of its own project", () => {
    expect(can(lead, "team.manage", asLead)).toBe(true);
    expect(can(lead, "task.create", asLead)).toBe(true);
    expect(can(lead, "task.delete", asLead)).toBe(true);
    expect(can(lead, "project.update", asLead)).toBe(true);
  });
  it("moves any task in its own project", () => {
    expect(can(lead, "task.updateStatus", { ...asLead, task: { assigneeId: "someone-else" } })).toBe(true);
  });
  it("has no authority in a project it does not lead", () => {
    expect(can(lead, "task.create", asMember)).toBe(false);
    expect(can(lead, "team.manage", asMember)).toBe(false);
    expect(can(lead, "task.create", asOutsider)).toBe(false);
  });
  it("cannot create or delete projects, or manage club members", () => {
    expect(can(lead, "project.create", asLead)).toBe(false);
    expect(can(lead, "project.delete", asLead)).toBe(false);
    expect(can(lead, "member.manage", asLead)).toBe(false);
  });
  it("cannot read club-wide activity", () => expect(can(lead, "activity.viewAll", asLead)).toBe(false));
});

describe("member", () => {
  it("views its own projects", () => expect(can(member, "project.view", asMember)).toBe(true));
  it("moves only its own assigned task", () => {
    expect(can(member, "task.updateStatus", { ...asMember, task: { assigneeId: member.id } })).toBe(true);
    expect(can(member, "task.updateStatus", { ...asMember, task: { assigneeId: "u-other" } })).toBe(false);
    expect(can(member, "task.updateStatus", { ...asMember, task: { assigneeId: null } })).toBe(false);
  });
  it("cannot create, edit, or delete tasks", () => {
    expect(can(member, "task.create", asMember)).toBe(false);
    expect(can(member, "task.update", asMember)).toBe(false);
    expect(can(member, "task.delete", asMember)).toBe(false);
  });
  it("cannot manage the team", () => expect(can(member, "team.manage", asMember)).toBe(false));
});

describe("outsider", () => {
  it("cannot view a project it does not belong to", () => {
    expect(can(outsider, "project.view", asOutsider)).toBe(false);
  });
  it("cannot move a task even if somehow assigned to it", () => {
    expect(can(outsider, "task.updateStatus", { membership: null, task: { assigneeId: outsider.id } })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Add to `package.json` scripts: `"test": "vitest run"`.

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./authz"`

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/authz.ts
export type GlobalRole = "ADMIN" | "MEMBER";
export type ProjectRole = "LEAD" | "MEMBER";

export type Actor = { id: string; role: GlobalRole };

export type Action =
  | "member.manage"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "project.view"
  | "team.manage"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "task.updateStatus"
  | "activity.viewAll";

export type Ctx = {
  /** The actor's role in the project under consideration; null if not a member. */
  membership?: ProjectRole | null;
  task?: { assigneeId: string | null };
};

export function can(actor: Actor, action: Action, ctx: Ctx = {}): boolean {
  if (actor.role === "ADMIN") return true;

  const membership = ctx.membership ?? null;
  const isLead = membership === "LEAD";
  const isMember = membership !== null;

  switch (action) {
    case "member.manage":
    case "project.create":
    case "project.delete":
    case "activity.viewAll":
      return false;

    case "project.view":
      return isMember;

    case "project.update":
    case "team.manage":
    case "task.create":
    case "task.update":
    case "task.delete":
      return isLead;

    case "task.updateStatus":
      if (isLead) return true;
      if (!isMember) return false;
      return ctx.task?.assigneeId === actor.id;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/authz.ts src/lib/authz.test.ts vitest.config.ts package.json
git commit -m "feat: permission matrix as a pure decision function"
```

---

### Task 3: Authentication

**Files:**
- Create: `src/auth.ts`, `src/middleware.ts`, `src/app/login/page.tsx`, `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `prisma` from Task 1
- Produces: `auth()`, `signIn()`, `signOut()` exported from `src/auth.ts`; session shape `{ user: { id: string } }`

- [ ] **Step 1: Configure Auth.js**

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials REQUIRES jwt; Auth.js throws UnsupportedStrategy otherwise.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw.email ?? "").toLowerCase().trim();
        const password = String(raw.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, passwordHash: true },
        });
        // Compare unconditionally so a missing user and a wrong password
        // take the same time; otherwise response latency enumerates accounts.
        const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const ok = await bcrypt.compare(password, hash);
        return ok && user ? { id: user.id } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // The token carries identity only. Role is never cached here — see guard.ts.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
```

- [ ] **Step 2: Mount the route handler**

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Gate routes in middleware**

```ts
// src/middleware.ts
export { auth as middleware } from "@/auth";
export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/admin/:path*", "/activity/:path*"],
};
```

- [ ] **Step 4: Build the login page**

A server component rendering a form that posts to a `"use server"` action calling `signIn("credentials", { email, password, redirectTo: "/dashboard" })`. On failure, render "Email or password is incorrect." — one message for both cases, so the form does not confirm which emails exist. Demo credentials are printed below the form, since this is a recruitment submission and a reviewer needs them.

- [ ] **Step 5: Verify**

Run: `npm run dev`, visit `/dashboard`
Expected: redirected to `/login`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: credentials auth with jwt sessions"
```

---

### Task 4: Guard layer

**Files:**
- Create: `src/lib/guard.ts`

**Interfaces:**
- Consumes: `can`, `Actor`, `Action`, `Ctx` from Task 2; `auth` from Task 3; `prisma` from Task 1
- Produces:
  - `requireActor(): Promise<Actor>` — throws `AuthError` when there is no session
  - `authorize(action: Action, opts?: { projectId?: string; taskId?: string }): Promise<{ actor: Actor; projectId?: string }>` — throws `ForbiddenError` when denied
  - `class ForbiddenError extends Error`

- [ ] **Step 1: Implement**

```ts
// src/lib/guard.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type Action, type Actor, type Ctx } from "@/lib/authz";

export class ForbiddenError extends Error {
  constructor() { super("You do not have permission to do that."); }
}
export class UnauthenticatedError extends Error {
  constructor() { super("Sign in to continue."); }
}

export async function requireActor(): Promise<Actor> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new UnauthenticatedError();
  // Read the role from the database, never from the token: an admin demoted
  // mid-session still holds a cookie claiming ADMIN until it expires.
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) throw new UnauthenticatedError();
  return { id: user.id, role: user.role };
}

export async function authorize(
  action: Action,
  opts: { projectId?: string; taskId?: string } = {},
): Promise<{ actor: Actor; projectId?: string }> {
  const actor = await requireActor();
  const ctx: Ctx = {};
  let projectId = opts.projectId;

  if (opts.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: opts.taskId },
      select: { projectId: true, assigneeId: true },
    });
    if (!task) throw new ForbiddenError();
    projectId = task.projectId;
    ctx.task = { assigneeId: task.assigneeId };
  }

  if (projectId) {
    const m = await prisma.membership.findUnique({
      where: { projectId_userId: { projectId, userId: actor.id } },
      select: { role: true },
    });
    ctx.membership = m?.role ?? null;
  }

  if (!can(actor, action, ctx)) throw new ForbiddenError();
  return { actor, projectId };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/guard.ts && git commit -m "feat: guard layer resolving permission context from the database"
```

---

### Task 5: Audit log helper

**Files:**
- Create: `src/lib/audit.ts`

**Interfaces:**
- Consumes: `prisma` from Task 1
- Produces: `writeAudit(tx, entry): Promise<void>` where `entry` is
  `{ actorId: string; action: string; entityType: "Task" | "Project" | "Membership" | "User"; entityId: string; projectId?: string | null; meta?: unknown }`

- [ ] **Step 1: Implement**

```ts
// src/lib/audit.ts
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  actorId: string;
  action: string;
  entityType: "Task" | "Project" | "Membership" | "User";
  entityId: string;
  projectId?: string | null;
  meta?: Prisma.InputJsonValue;
};

/** Call inside the same transaction as the mutation, so an audit gap is impossible. */
export async function writeAudit(tx: Db, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({ data: { ...entry, projectId: entry.projectId ?? null } });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audit.ts && git commit -m "feat: transaction-aware audit log helper"
```

---

### Task 6: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` — add `"prisma": { "seed": "tsx prisma/seed.ts" }`

**Interfaces:**
- Consumes: `prisma` from Task 1
- Produces: a populated database; prints demo credentials on completion

- [ ] **Step 1: Implement**

Create, in this order:
1. One admin: `admin@envision.club`.
2. Seven members, real-sounding names. Two of them will lead.
3. Four projects with staggered deadlines: one overdue, one due this week, two comfortable.
4. Memberships such that **at least one person leads one project and is a plain member of another** — this is the model's whole argument and must be visible in the demo.
5. ~30 tasks spread across all three statuses and all three priorities, with due dates including several already past, several this week, and several distant. Assign most, leave three unassigned so the Lead dashboard's "needs an owner" section is populated.
6. Audit entries for the seeded work so `/activity` is not empty on first load.

All passwords: `envision2026`, hashed with `bcrypt.hashSync(pw, 12)`. Script is idempotent — `deleteMany` in FK-safe order first.

- [ ] **Step 2: Run it**

Run: `npx prisma db seed`
Expected: prints the three demo logins; `npx prisma studio` shows ~30 tasks.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts package.json && git commit -m "feat: seed script with demo club data"
```

---

### Task 7: Design system and app shell

**Files:**
- Create: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/Nav.tsx`, `src/components/ui/` (Badge, ProgressBar, Avatar, EmptyState)

**Interfaces:**
- Consumes: `auth` from Task 3
- Produces: CSS custom properties listed in "Design tokens"; `<Nav />` rendering role-appropriate links

- [ ] **Step 1: Define tokens and base type**

In `globals.css`, declare the seven tokens from the Design tokens table under `:root`, load Fraunces and Archivo via `next/font/google` in `layout.tsx`, set `body` to `--ink`/`--paper`, and define the type scale. Give `.tabular { font-variant-numeric: tabular-nums; }` for every date and count.

- [ ] **Step 2: Build the state vocabulary**

One `Badge` component whose colour is derived from state, never passed in: overdue → `--ember`; in progress or due within 3 days → `--glow`; completed → `--ash` at reduced opacity. `ProgressBar` fills with `--glow` on an `--ink-edge` track.

- [ ] **Step 3: Build the nav**

Links: Dashboard, Projects, Activity, and Admin only when the actor is an admin. The admin link's absence is cosmetic — `/admin` is independently gated in middleware and in every admin action.

- [ ] **Step 4: Verify accessibility floor**

Every interactive element has a visible focus ring in `--glow`. `@media (prefers-reduced-motion: reduce)` disables the load animation. Check `--paper` on `--ink` and `--ash` on `--ink` both clear 4.5:1.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: design tokens and app shell"
```

---

### Task 8: Server actions

**Files:**
- Create: `src/app/actions/projects.ts`, `src/app/actions/tasks.ts`, `src/app/actions/members.ts`

**Interfaces:**
- Consumes: `authorize`, `ForbiddenError` from Task 4; `writeAudit` from Task 5
- Produces: `createProject`, `updateProject`, `deleteProject`, `addProjectMember`, `setProjectRole`, `removeProjectMember`, `createTask`, `updateTask`, `setTaskStatus`, `deleteTask`, `createMember`, `setGlobalRole` — each `(formData: FormData) => Promise<{ error?: string }>`

- [ ] **Step 1: Establish the shape with one action**

Every action follows this template exactly. `setTaskStatus` is the reference implementation because it exercises the narrowest rule in the matrix:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { authorize } from "@/lib/guard";
import { writeAudit } from "@/lib/audit";

const STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
type Status = (typeof STATUSES)[number];

export async function setTaskStatus(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as Status)) return { error: "Unknown status." };

  // Authorization first, always. taskId resolves the project and the assignee.
  const { actor, projectId } = await authorize("task.updateStatus", { taskId });

  const before = await prisma.task.findUniqueOrThrow({
    where: { id: taskId }, select: { status: true },
  });
  if (before.status === status) return {};

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        status: status as Status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: "task.status_changed",
      entityType: "Task",
      entityId: taskId,
      projectId,
      meta: { from: before.status, to: status },
    });
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}
```

- [ ] **Step 2: Write the remaining actions to that template**

Each: validate input → `authorize(...)` → transaction containing the mutation and its `writeAudit` → `revalidatePath` → return. Audit action strings: `project.created`, `project.updated`, `project.deleted`, `team.member_added`, `team.role_changed`, `team.member_removed`, `task.created`, `task.updated`, `task.status_changed`, `task.deleted`, `member.created`, `member.role_changed`.

- [ ] **Step 3: Verify the guard is unskippable**

Read every exported function in the three files. Confirm each calls `authorize` before its first `prisma` write. Any that does not is a vulnerability, not a style issue.

Run: `npx tsc --noEmit && npm test`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/actions && git commit -m "feat: server actions with authorization and audit trail"
```

---

### Task 9: Queries and formatting helpers

**Files:**
- Create: `src/lib/queries.ts`, `src/lib/format.ts`

**Interfaces:**
- Produces: `getAdminDashboard(actor)`, `getLeadDashboard(actor)`, `getMemberDashboard(actor)`, `getProjectsFor(actor)`, `getProjectDetail(actor, id)`, `getActivityFor(actor)`; `dueState(dueDate, status): "overdue" | "soon" | "later" | "done"`, `progressOf(tasks)`

- [ ] **Step 1: Implement the read paths**

Non-admin queries are scoped in the `where` clause by membership — scoping is a query concern, not a `can()` concern. Every list query has a `take`. Dashboard aggregates use `groupBy` rather than fetching rows and counting in JavaScript.

- [ ] **Step 2: Implement `dueState`**

`done` when status is `COMPLETED`; `overdue` when `dueDate < now`; `soon` when within 3 days; otherwise `later`. This single function decides every badge colour in the app.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts src/lib/format.ts && git commit -m "feat: scoped read paths and deadline state"
```

---

### Task 10: The three dashboards

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`, `_admin.tsx`, `_lead.tsx`, `_member.tsx`

- [ ] **Step 1: Branch on role**

`page.tsx` calls `requireActor()`, then renders one of three components. No shared "stat tile row" — the three views differ in structure, not just in filtered data.

- [ ] **Step 2: Build the member view**

Hero is the late work, not statistics: a Fraunces headline stating the count in words — "Two tasks are late." — with those tasks listed directly beneath, each linking to its project. Below: remaining work grouped by status, ordered by due date. When nothing is late the headline becomes "Nothing is late." and the ember palette is absent from the page entirely.

- [ ] **Step 3: Build the lead view**

Projects they lead, each with a progress bar and its overdue count. A "Needs an owner" section listing unassigned tasks — the thing only a lead can resolve. Then their own assigned work, since a lead is also a member.

- [ ] **Step 4: Build the admin view**

Club-wide: projects at risk (deadline near, completion low) as the hero, then a project table with progress and lead, then member count and the recent activity stream in the side rail.

- [ ] **Step 5: Verify**

Log in as each of the three seeded roles. Confirm the three pages differ structurally, not only in content.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: role-specific dashboards"
```

---

### Task 11: Projects, board, team, admin, activity

**Files:**
- Create: `src/app/(app)/projects/page.tsx`, `src/app/(app)/projects/[id]/page.tsx`, `src/app/(app)/admin/page.tsx`, `src/app/(app)/activity/page.tsx`, `src/components/TaskBoard.tsx`, `src/components/TeamPanel.tsx`

- [ ] **Step 1: Project list**

Admin sees all projects; everyone else sees theirs. Rows, not cards: name, lead, progress, deadline state. Density beats decoration here.

- [ ] **Step 2: Project detail**

Three status columns on desktop, stacked sections below 768px. Task cards are deliberately non-uniform — high priority carries more visual weight. Status changes through a segmented control that submits `setTaskStatus`; the control renders disabled when the viewer may not move that task, and the action rejects it regardless.

- [ ] **Step 3: Team panel**

Members with their project role. Leads and admins get add/remove and a promote-to-lead control. Everyone else sees the roster read-only.

- [ ] **Step 4: Admin page**

Members table with global role control, project creation form, lead assignment. Guarded in middleware and in every action it calls.

- [ ] **Step 5: Activity page**

Reverse-chronological, grouped by day. Each entry renders as a sentence: "Priya moved Draft sponsor deck to In progress." Admin sees everything; others see their projects.

- [ ] **Step 6: Verify authorization by hand**

Sign in as a member. Attempt to submit a status change for a task assigned to someone else by editing the form's `taskId` in devtools.
Expected: the action returns the forbidden error and nothing changes in the database.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: projects, task board, team management, and activity log"
```

---

### Task 12: Responsive, empty states, and polish

- [ ] **Step 1: Check every page at 360, 768, 1024, and 1440px**

No horizontal overflow at any width. The board stacks below 768. Tables become definition lists rather than scrolling sideways.

- [ ] **Step 2: Write the empty states**

Each is an invitation to act, in the interface's voice: "No projects yet. Create the first one." Never a shrug, never an apology.

- [ ] **Step 3: Keyboard pass**

Tab through login, board, and admin. Every control reachable, focus always visible.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "polish: responsive layout, empty states, keyboard access"
```

---

### Task 13: Deploy, document, record

- [ ] **Step 1: Deploy to Vercel**

Import the repository, set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`. Run the seed against the production database once.

- [ ] **Step 2: Write the README**

Sections, in order: what it is, the live URL and demo credentials, features, stack, the role-model rationale (`Membership.role`, not `User.role` — the argument from the spec), setup, environment variables, schema with the Prisma block, screenshots, and a short "known gaps" note naming the missing login rate limit.

- [ ] **Step 3: Capture screenshots**

Dashboard as each role, the board, and the activity log. Seeded data only.

- [ ] **Step 4: Record the demo, 3–5 minutes**

Log in as each role in turn; show the same route rendering differently. As admin create a project and assign a lead. As that lead assign a task. As the assignee move it. Show the activity log having recorded all of it. Close on the role model: the same person leading one project and following in another.

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "docs: readme, screenshots, and deployment notes"
```

---

## Self-review

**Spec coverage.** Secure login → Task 3. RBAC → Tasks 2, 4, 8. Members in multiple projects → Task 1 schema, seeded in Task 6, demonstrated in Task 13. Project creation and team formation → Tasks 8, 11. Task assignment with deadlines and priorities → Tasks 1, 8, 11. Three statuses → Task 1 enum, Task 8 action, Task 11 control. Dashboard → Task 10. Responsive → Tasks 7, 12. Audit log → Tasks 5, 8, 11. Seed → Task 6. Deployment, README, video → Task 13. No spec section is unimplemented.

**Placeholder scan.** No TBDs. The one instruction phrased as prose rather than code is Task 6's seed content, which specifies exact counts and the required overlap rather than saying "add some data."

**Type consistency.** `can(actor, action, ctx)` in Task 2 is consumed with that signature in Task 4. `Ctx.membership` is `ProjectRole | null` throughout. `authorize` returns `{ actor, projectId }` in Task 4 and is destructured as such in Task 8. Audit action strings in Task 8 Step 2 match the `writeAudit` entry type from Task 5. `dueState` returns the four values consumed by the Badge in Task 7.
