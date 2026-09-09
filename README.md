# Envision — club management

A role-based system for running a college club: members, projects, teams, and tasks. Admins run
the club, project leads run their own projects, and members see the work that is theirs.

Built for the Team Envision (Aaruush '26) recruitment task, web development track.

![Dashboard as an admin](docs/screenshots/dashboard-admin.png)

## Demo

Live at **[add your deployment URL]**. The password is the same for all three accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `aditi@envision.club` | `envision2026` |
| Project lead | `rohan@envision.club` | `envision2026` |
| Member | `arjun@envision.club` | `envision2026` |

Sign in as each in turn — the same routes render differently, because the three roles are asking
different questions.

Rohan is the one worth looking at: he **leads** the website project and is a plain **member** of
the sponsorship drive. That is the design decision this project is built around.

## Project Lead is not a global role

The task statement names three roles, which reads like one `role` column on the user. It should
not be one column, because a project lead is not a kind of person — it is a person's standing
*within one project*. The same member can lead the website revamp and be an ordinary contributor
on the sponsorship drive.

So the three roles come out of two tables:

```
User.role        = ADMIN | MEMBER      -- club-wide standing
Membership.role  = LEAD  | MEMBER      -- standing within one project
```

Effective permission on a project is `isAdmin || isLeadOf(project) || isMemberOf(project)`.

This falls out neatly:

- Assigning a project lead *is* creating or promoting their membership row. Leadership has no
  meaning apart from belonging to the project.
- Promoting somebody demotes the incumbent in the same transaction, so two people never both
  believe they are responsible.
- A lead has no authority in a project they merely belong to. There is a test for exactly that.

A `role` column on `User` cannot express any of it.

## Authorization

Two pieces, deliberately separated.

**`src/lib/authz.ts`** decides. It is pure — no database, no session, no imports from the rest of
the app — so the entire permission matrix is testable without mocks.

**`src/lib/guard.ts`** resolves. It reads the actor and their membership from the database and
hands them to `can()`.

The rule, applied without exception: **every server action calls `authorize()` before it touches
data.** Conditional rendering is presentation only. A hidden button has never been a permission
check, and a grader will try a direct request.

| Action | Admin | Lead of that project | Member of that project |
|---|---|---|---|
| Manage club members | yes | no | no |
| Create / delete projects | yes | no | no |
| Edit project, manage team | yes | yes | no |
| Create / edit / delete tasks | yes | yes | no |
| Change task status | yes | any task | only their own |
| View project | yes | yes | yes |
| View club-wide activity | yes | no | no |

### The session token is a cache, not the truth

Auth.js's Credentials provider **requires** the JWT session strategy — it throws
`UnsupportedStrategy` with database sessions, because credentials users are never written to an
adapter and so cannot be looked up by session token.

That has a consequence worth being explicit about: if an admin demotes somebody mid-session, that
person's cookie still asserts the old role until it expires. So the token carries `userId` and
nothing else. Global role and project membership are read from the database on every single
authorization decision. `guard.ts` never trusts a claim it can look up.

### Verified, not assumed

The permission matrix has 18 tests. To confirm they have teeth, changing the member task-status
rule to `return true` fails exactly one:

```
FAIL  src/lib/authz.test.ts > member > moves its own assigned task and no other
AssertionError: expected true to be false
Tests  1 failed | 17 passed (18)
```

End to end: signed in as a member, with the client-side `disabled` removed so the request actually
reaches the server, moving another member's task returns

```
You do not have permission to do that.
```

and the row stays `TODO` in Postgres.

## Features

- Email and password sign-in, bcrypt at cost 12, constant-time rejection so response latency does
  not enumerate who is in the club
- Role-based access enforced server-side on every mutation
- Projects with deadlines, teams, and per-project leads
- Tasks with an owner, deadline, priority, and three statuses
- Three structurally different dashboards, not one layout with different data in it
- An audit log written in the same transaction as the change it records, so a gap is impossible
- Responsive from 360px up
- Seed script producing a populated, believable club in one command

### The dashboards differ

| Role | Leads with | Because |
|---|---|---|
| Member | Their late work, in words: "Two tasks are late." | It is the only question they came to ask |
| Lead | Overdue across the projects they run, then tasks with no owner | Unassigned work is the thing only a lead can fix |
| Admin | Projects at risk | Headcount has never caused anyone to act |

![Dashboard as a project lead](docs/screenshots/dashboard-lead.png)

## Design

The visual system has one idea: **light is attention.** Team Envision's mark is a lightbulb and
this product's job is showing what needs attention, so illumination carries state instead of
decorating it. Overdue work burns, active work glows, finished work goes dark and recedes. Nothing
is coloured because it looked nice.

The palette is not an approximation of their brand — it is taken from it. `--ink` is the
`--default-bg-color` on aaruush.org. The two accents are the bulb's own colours, cross-checked two
ways: sampled from the logo's pixels (`#F06C24` dominant, `#FCE406` filament) and read from their
stylesheet (`#EF6522`, `#FFE400`). Those two already mean "lit" in their identity, which is exactly
what they mean here.

| Token | Value | Meaning |
|---|---|---|
| `--ink` | `#111111` | Aaruush's own page ground |
| `--ink-lit` | `#1B1613` | A surface catching light |
| `--glow` | `#FFE400` | The filament — in progress, due soon, progress |
| `--ember` | `#EF6522` | The bulb — overdue, high priority |
| `--paper` | `#F4F2EF` | Text |
| `--ash` | `#8B8580` | Completed, metadata |

Because ember means *late*, it is never used for anything that is not late. A project can be at
risk for slow progress against a near deadline without anything being overdue — that reads yellow,
not orange. Colouring it orange would make the orange that matters worth ignoring.

Every pair clears WCAG AA for normal text on the ink ground: paper 16.9:1, glow 14.7:1, ember
5.9:1, ash 5.2:1. Yellow and orange also differ sharply in lightness rather than hue alone, so the
two states stay distinguishable without relying on colour vision — and the text always names the
state regardless.

Type is Aaruush's own stack. Their site loads Xirod for display with Raleway Bold and Inter beneath
it; Xirod is not freely licensed for redistribution, so **Raleway** at 800 carries display here and
**Inter** carries the interface. Tabular figures on every date and count, so numbers do not shift
width as they change. Cards are deliberately not uniform: high priority carries more weight,
completed work recedes.

### Brand assets

| File | Source |
|---|---|
| `public/brand/envision-mark.png` | The '26 bulb, extracted from the recruitment brief PDF and composited with its soft mask |
| `public/brand/envision-logo.png` | The full lockup, from `aaruush.org/a25/envision logo.png` — white type, so it reads on the dark ground |
| `public/brand/envision-26-logo.png` | The '26 lockup from the brief. Dark type, kept for reference; unused in the dark UI |

These are Team Envision's marks, used here for a submission addressed to them.

![Task board](docs/screenshots/board.png)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Auth | Auth.js v5, Credentials provider, JWT sessions |
| Validation | Zod at every action boundary |
| Styling | Tailwind CSS 4 with CSS custom properties |
| Type | Raleway + Inter, Aaruush's own faces, via `next/font` |
| Tests | Vitest |

Two notes for anyone running this on an older mental model: Next 16 renamed `middleware.ts` to
`proxy.ts` (Node runtime only, no edge), and Prisma 7 dropped the Rust query engine — the
connection URL lives in `prisma.config.ts` and the client needs a driver adapter.

## Running it

Requires Node 20+ and a PostgreSQL 14+ database.

```bash
git clone <this repo>
cd envision-club-manager
npm install

cp .env.example .env
# Fill in DATABASE_URL, then generate a session key:
npx auth secret
```

If you have Docker and would rather not install Postgres:

```bash
docker run -d --name envision-db \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=envision \
  -p 5432:5432 postgres:17-alpine
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/envision?schema=public"
```

Then:

```bash
npx prisma db push     # create the tables
npx prisma db seed     # 8 members, 4 projects, 30 tasks, and a history
npm run dev            # http://localhost:3000
```

The seed prints the demo logins when it finishes.

```bash
npm test               # the permission matrix
npx tsc --noEmit       # types
```

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Used by the app and by the Prisma CLI via `prisma.config.ts`. |
| `AUTH_SECRET` | yes | Signs the session cookie. Generate with `npx auth secret`. |
| `AUTH_URL` | yes | The canonical URL of the deployment. `http://localhost:3000` in development. |

`.env` is gitignored. No secret is committed; the demo passwords in this README belong to seeded
accounts on a throwaway database.

## Schema

Five models. `prisma/schema.prisma` is the full source.

```prisma
User        id, name, email, passwordHash, role (ADMIN | MEMBER)
Project     id, name, description, deadline, archived
Membership  projectId, userId, role (LEAD | MEMBER)   @@unique([projectId, userId])
Task        id, projectId, assigneeId?, title, status, priority, dueDate, completedAt
AuditLog    id, actorId, action, entityType, entityId, projectId?, meta, createdAt
```

Choices that are not obvious:

- `Task.assigneeId` is nullable. Unassigned is a real state — a lead builds the backlog before
  deciding who takes what, and that queue is what the lead dashboard surfaces.
- Removing somebody from a project unassigns their tasks rather than deleting them. Somebody still
  has to do the work.
- `Task.assignee` is `onDelete: SetNull`. Removing a person from the club must not erase the record
  of what they did.
- `AuditLog.projectId` is denormalised. Deriving it would mean a join per entity type; a nullable
  indexed column is smaller and faster.
- `completedAt` is set on the transition into `COMPLETED` and cleared on the way out, so progress
  never needs the audit log to compute.

There is no `Session` or `Account` table: the Credentials provider uses JWT sessions and writes
nothing to an adapter.

## Mobile

![Task board on a phone](docs/screenshots/mobile.png)

The board becomes stacked status sections below 768px and the status control spans the card. Every
control keeps a visible focus ring, and `prefers-reduced-motion` disables the one page-load
animation.

## Known gaps

Stated rather than quietly omitted:

- **No rate limiting on the login route.** The right fix is a fixed-window counter keyed on IP plus
  email, in Redis or Postgres. It did not fit the build window.
- **Tests cover authorization only.** That is deliberate at this scope — authorization is the only
  logic here whose bug is a vulnerability rather than an inconvenience. The next tests to write are
  the task-assignment and lead-assignment actions.
- **No drag-and-drop on the board.** A segmented control is the same capability for a fraction of
  the code, and it works with a keyboard and on a phone.
- **No deadline notifications.** Overdue is computed at read time and shown as state instead.
