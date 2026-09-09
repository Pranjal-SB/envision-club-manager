# Club Management System — Design

Submission for Team Envision (Aaruush '26) recruitment, Web Development track.

Build window: ~24 hours. Every decision below is scoped to that.

## Goal

A role-based system for managing club members, projects, teams, and tasks.
Three roles, server-enforced. A dashboard that shows each role something
genuinely different. Deployed at a public URL, documented, and demoed in a
3–5 minute video.

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | One app, one deploy. Server Components put authorization on the server by construction. |
| Database | Postgres on Neon | Free, serverless, no local server to run. |
| ORM | Prisma | The schema file doubles as the README's schema documentation. |
| Auth | Auth.js v5, credentials provider, JWT session strategy | Password handling that is already reviewed. `secure login` is graded; hand-rolled session crypto is where these go wrong. Strategy is forced — see Authentication. |
| Styling | Tailwind CSS 4 | |
| Hosting | Vercel + Neon | |
| Tests | Vitest | One file. See Testing. |

## The role model

The task statement names three roles: Admin, Project Lead, Member. Read
literally, that suggests one `role` column on `User`. It should not be one
column, because Project Lead is not a property of a person — it is a property
of a person *within a project*. The same member can lead the website revamp and
be a plain contributor on the sponsorship drive.

So the three roles come from two tables:

```
User.role        = ADMIN | MEMBER      // club-wide standing
Membership.role  = LEAD  | MEMBER      // standing within one project
```

Effective permission on a project is `isAdmin || isLeadOf(project) || isMemberOf(project)`.

Consequences:

- Admin is global and rare. It is not a membership.
- A Lead is always also a member of that project. Creating a `LEAD` membership
  is the act of "assigning a Project Lead."
- Demoting a lead is a role change on the membership row, not a user edit.

## Data model

Five models, all ours. Auth.js contributes no tables here — see Authentication.

```prisma
enum GlobalRole    { ADMIN MEMBER }
enum ProjectRole   { LEAD MEMBER }
enum TaskStatus    { TODO IN_PROGRESS COMPLETED }
enum TaskPriority  { LOW MEDIUM HIGH }

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         GlobalRole @default(MEMBER)
  createdAt    DateTime @default(now())

  memberships  Membership[]
  assignedTasks Task[]     @relation("assignee")
  auditEntries AuditLog[]
}

model Project {
  id          String    @id @default(cuid())
  name        String
  description String?
  deadline    DateTime?
  archived    Boolean   @default(false)
  createdAt   DateTime  @default(now())

  memberships Membership[]
  tasks       Task[]
}

model Membership {
  id        String      @id @default(cuid())
  projectId String
  userId    String
  role      ProjectRole @default(MEMBER)
  joinedAt  DateTime    @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
}

model Task {
  id          String       @id @default(cuid())
  projectId   String
  assigneeId  String?
  title       String
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  createdAt   DateTime     @default(now())
  completedAt DateTime?

  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee    User?   @relation("assignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  @@index([projectId, status])
  @@index([assigneeId, dueDate])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String   // "task.status_changed", "project.lead_assigned", ...
  entityType String   // "Task" | "Project" | "Membership" | "User"
  entityId   String
  projectId  String?  // denormalized so a project's activity is one indexed query
  meta       Json?    // { from: "TODO", to: "IN_PROGRESS" }
  createdAt  DateTime @default(now())

  actor      User @relation(fields: [actorId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
  @@index([createdAt])
}
```

Notes on choices that are not obvious:

- `assigneeId` is nullable. Unassigned tasks are a real state — a Lead creates
  the backlog before deciding who takes what, and the Lead dashboard surfaces
  exactly these.
- `Task.onDelete: SetNull` for assignee: removing a person from the club must
  not delete the history of work.
- `AuditLog.projectId` is denormalized. Deriving it would mean a join per entity
  type; a nullable column plus an index is smaller and faster.
- `completedAt` is set when status transitions to `COMPLETED` and cleared when it
  transitions away. It powers the progress figures without scanning the audit log.

## Authentication

Auth.js v5 with the Credentials provider. Passwords hashed with bcrypt (cost 12)
and never returned from any query — `passwordHash` is excluded by explicit
`select` on every read path.

**The session strategy is not a free choice.** Auth.js throws
`UnsupportedStrategy` when a Credentials provider is configured without
`strategy: "jwt"`; credentials-authenticated users are not persisted to the
adapter, so database sessions cannot look them up. Sessions are therefore
JWTs in an httpOnly, secure, sameSite cookie, signed with `AUTH_SECRET`. No
`Session` or `Account` table exists, and no Prisma adapter is configured.

This has one consequence worth stating, because it is the kind of thing that
quietly becomes a bug: **the JWT is a cache, not the source of truth.** If an
admin demotes someone mid-session, that person's cookie still claims the old
global role until it expires.

The mitigation is a rule, not a mechanism: `can()` never trusts the token for
anything it can look up. Project-scoped decisions read `Membership` from the
database on every call, and the global `ADMIN` check re-reads `User.role` rather
than reading the claim. The token carries `userId` and is used for identity
only. Session lifetime is 8 hours.

Rate limiting on the login route is out of scope for this window; it is noted in
the README as a known gap rather than silently omitted.

## Authorization

One file: `lib/authz.ts`. It exports a single decision function.

```ts
type Action =
  | "project.create" | "project.update" | "project.delete"
  | "member.manage"                       // add/remove club members, set global role
  | "team.manage"                         // add/remove project members, assign lead
  | "task.create" | "task.update" | "task.delete"
  | "task.updateStatus"
  | "project.view" | "activity.viewAll";

can(actor: SessionUser, action: Action, ctx?: { project?, membership?, task? }): boolean
```

Rules:

| Action | Admin | Lead (of that project) | Member (of that project) |
|---|---|---|---|
| `member.manage` | yes | no | no |
| `project.create` / `delete` | yes | no | no |
| `project.update` | yes | yes | no |
| `team.manage` | yes | yes | no |
| `task.create` / `update` / `delete` | yes | yes | no |
| `task.updateStatus` | yes | yes | only own assigned task |
| `project.view` | yes | yes | yes |
| `activity.viewAll` | yes | no | no |

Enforcement rule, stated once and applied without exception: **every server
action calls `can()` as its first statement, after resolving the session.**
Conditional rendering in components is presentation only. A hidden button is not
a permission check, and the grader may well try a direct request.

Non-admin activity views are scoped to projects the actor belongs to; that
scoping lives in the query, not in `can()`.

## Routes

| Route | Access | Contents |
|---|---|---|
| `/login` | public | Credentials form. Redirects to `/dashboard`. |
| `/dashboard` | any session | Branches on role — three genuinely different views. |
| `/projects` | any session | Admin sees all; others see their own. |
| `/projects/[id]` | project members + admin | Task board, team panel, project activity. |
| `/admin` | admin | Members table, create project, assign leads. |
| `/activity` | any session | Admin: club-wide. Others: their projects only. |

`middleware.ts` gates authentication and the `/admin` prefix. It is a
convenience, not the security boundary — server actions are.

## Dashboards

The requirement is one dashboard, but a single shared view would waste the role
model. Three branches:

- **Admin** — club-wide rollup: project count and health, member count, tasks
  overdue across all projects, recent activity stream, projects at risk
  (deadline near with low completion).
- **Lead** — projects they lead: per-project completion, unassigned tasks
  needing attention, overdue tasks grouped by assignee, their own assigned work.
- **Member** — their tasks across every project, sorted by due date, grouped by
  status, with an overdue callout and a personal completion figure.

## Visual direction

Dark editorial, built on Aaruush's own amber. Not a card grid.

- Ground: near-black, layered surfaces rather than bordered boxes.
- Accent: Aaruush amber, used **semantically only** — priority, overdue,
  progress. Never decorative.
- Type: a real pairing with strong scale contrast. Headings carry the hierarchy;
  the interface does not rely on boxes to separate things.
- Spacing: intentional rhythm, not uniform padding.
- States: hover, focus, and active are designed, not defaults. Focus rings must
  be visible — keyboard access is graded under "responsive/accessible" in spirit
  even if not named.
- Responsive at 360 / 768 / 1024 / 1440. The task board collapses to stacked
  status sections on mobile.

Design tokens live in `app/globals.css` as CSS custom properties. No hardcoded
hex values in components.

## Testing

`lib/authz.test.ts` — the permission matrix above, asserted case by case,
including the negative cases: a Member cannot change another member's task
status; a Lead of project A has no authority in project B; a non-member cannot
view a project.

That is the whole test suite, deliberately. In a 24-hour build the only logic
whose bug is a *vulnerability* rather than an inconvenience is authorization.
CRUD correctness is verified by using the app while building it. If the window
extends, the next tests to write are the server actions for task assignment and
lead assignment.

## Seed script

`prisma/seed.ts` creates: one admin, two leads, five members, four projects with
overlapping membership (at least one person who leads one project and is a
member of another — the model's whole point, visible in the demo), and roughly
thirty tasks spread across statuses, priorities, and due dates, including some
already overdue and some due this week.

Credentials are printed on completion and documented in the README so a reviewer
can log in as each role. These are demo accounts on a throwaway database; no
real secret is committed.

## Deployment

Vercel + Neon, wired on hour one rather than hour twenty-three. `DATABASE_URL`,
`AUTH_SECRET`, and `AUTH_URL` come from the environment; nothing is hardcoded.
`.env.example` documents every variable. `.env` is gitignored from the first
commit.

## Deliverables

1. **Repository** — clean structure, meaningful commit history, no secrets.
2. **README** — overview, features, stack, setup, schema, the role-model
   rationale, environment variables, screenshots, live URL, demo credentials.
3. **Demo video**, 3–5 minutes: log in as each role in turn, show that the same
   screen differs by role, create a project and assign a lead as admin, assign a
   task as lead, move it as member, and show the activity log recording all of it.

## Build order

| Hours | Work |
|---|---|
| 0–2 | Scaffold, Prisma schema, Neon, seed script, deploy the empty app to Vercel |
| 2–5 | Auth.js, `lib/authz.ts`, `authz.test.ts` green |
| 5–11 | Projects, memberships, tasks, server actions, audit log writes |
| 11–17 | The three dashboards, design pass |
| 17–20 | Responsive, empty states, focus states, polish |
| 20–24 | README, screenshots, demo video |

## Out of scope

| Excluded | Reason |
|---|---|
| Drag-and-drop board | dnd-kit plus optimistic reordering is 3–4 hours. A segmented status control is the same capability in twenty minutes. |
| Deadline notifications | Needs a scheduler. An overdue badge computed at read time covers the visible need. |
| Real-time updates | Nothing in the task statement requires them. |
| File attachments, comments | Not in the task statement. |
| Broader test suite | See Testing. |
| Docker / self-hosted deployment | Belongs to the Cloud & DevOps track, decided separately. |
