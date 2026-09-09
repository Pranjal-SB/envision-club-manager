import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const PASSWORD = "envision2026";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
/** Days from today. Negative is the past. */
const at = (days: number) => new Date(now + days * day);

async function main() {
  // Idempotent: FK-safe order, so re-running the seed is always safe.
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = bcrypt.hashSync(PASSWORD, 12);

  const people = [
    { key: "aditi", name: "Aditi Raghavan", email: "aditi@envision.club", role: "ADMIN" as const },
    { key: "rohan", name: "Rohan Mehta", email: "rohan@envision.club", role: "MEMBER" as const },
    { key: "priya", name: "Priya Nair", email: "priya@envision.club", role: "MEMBER" as const },
    { key: "kabir", name: "Kabir Sethi", email: "kabir@envision.club", role: "MEMBER" as const },
    { key: "isha", name: "Isha Bhattacharya", email: "isha@envision.club", role: "MEMBER" as const },
    { key: "arjun", name: "Arjun Verma", email: "arjun@envision.club", role: "MEMBER" as const },
    { key: "meera", name: "Meera Krishnan", email: "meera@envision.club", role: "MEMBER" as const },
    { key: "dev", name: "Dev Anand", email: "dev@envision.club", role: "MEMBER" as const },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const p of people) {
    const u = await prisma.user.create({
      data: { name: p.name, email: p.email, passwordHash, role: p.role },
    });
    users[p.key] = { id: u.id, name: u.name };
  }

  const projects = [
    {
      key: "site",
      name: "Aaruush '26 Website",
      description: "Public site for the fest: schedule, events, registration, sponsor wall.",
      deadline: at(-4), // already past — the admin dashboard should be shouting about this
    },
    {
      key: "sponsor",
      name: "Sponsorship Drive",
      description: "Outreach, decks, and follow-up for title and category sponsors.",
      deadline: at(5), // due this week
    },
    {
      key: "merch",
      name: "Merch & Identity",
      description: "Hoodies, badges, stage backdrop, and the social kit.",
      deadline: at(26),
    },
    {
      key: "ops",
      name: "Hackathon Operations",
      description: "Venue, judging rubric, participant comms, and day-of logistics.",
      deadline: at(41),
    },
  ];

  const projectIds: Record<string, string> = {};
  for (const p of projects) {
    const created = await prisma.project.create({
      data: { name: p.name, description: p.description, deadline: p.deadline },
    });
    projectIds[p.key] = created.id;
  }

  /*
    Membership is where the design argument lives, so the seed has to prove it.
    Rohan LEADS the website and is a plain MEMBER of the sponsorship drive.
    Priya LEADS merch and is a plain MEMBER of the website team.
    A reviewer can see in one screen that leadership does not travel with the
    person — which a `role` column on User could not express.
  */
  const team: Array<[string, string, "LEAD" | "MEMBER"]> = [
    ["site", "rohan", "LEAD"],
    ["site", "priya", "MEMBER"],
    ["site", "kabir", "MEMBER"],
    ["site", "dev", "MEMBER"],

    ["sponsor", "isha", "LEAD"],
    ["sponsor", "rohan", "MEMBER"],
    ["sponsor", "meera", "MEMBER"],

    ["merch", "priya", "LEAD"],
    ["merch", "arjun", "MEMBER"],
    ["merch", "meera", "MEMBER"],

    ["ops", "kabir", "LEAD"],
    ["ops", "dev", "MEMBER"],
    ["ops", "arjun", "MEMBER"],
    ["ops", "isha", "MEMBER"],
  ];

  for (const [project, person, role] of team) {
    await prisma.membership.create({
      data: { projectId: projectIds[project], userId: users[person].id, role },
    });
  }

  type Seeded = {
    project: string;
    title: string;
    assignee: string | null;
    status: "TODO" | "IN_PROGRESS" | "COMPLETED";
    priority: "LOW" | "MEDIUM" | "HIGH";
    due: number | null;
  };

  const tasks: Seeded[] = [
    // Website — behind schedule, which is the point
    { project: "site", title: "Ship the events listing page", assignee: "kabir", status: "IN_PROGRESS", priority: "HIGH", due: -2 },
    { project: "site", title: "Wire registration to the payment gateway", assignee: "dev", status: "TODO", priority: "HIGH", due: -1 },
    { project: "site", title: "Sponsor wall with tier sizing", assignee: "priya", status: "TODO", priority: "MEDIUM", due: 3 },
    { project: "site", title: "Mobile nav keeps trapping focus", assignee: "kabir", status: "TODO", priority: "HIGH", due: 1 },
    { project: "site", title: "Set up staging deploy", assignee: "dev", status: "COMPLETED", priority: "MEDIUM", due: -9 },
    { project: "site", title: "Pick and license the display typeface", assignee: "priya", status: "COMPLETED", priority: "LOW", due: -12 },
    { project: "site", title: "Compress the hero video", assignee: null, status: "TODO", priority: "LOW", due: 8 },
    { project: "site", title: "Schedule page: filter by day and track", assignee: "kabir", status: "IN_PROGRESS", priority: "MEDIUM", due: 6 },

    // Sponsorship — due this week
    { project: "sponsor", title: "Rebuild the title sponsor deck", assignee: "isha", status: "IN_PROGRESS", priority: "HIGH", due: 2 },
    { project: "sponsor", title: "Follow up with last year's category sponsors", assignee: "meera", status: "IN_PROGRESS", priority: "HIGH", due: 1 },
    { project: "sponsor", title: "Draft the tier pricing sheet", assignee: "rohan", status: "COMPLETED", priority: "MEDIUM", due: -6 },
    { project: "sponsor", title: "Shortlist fifteen local outreach targets", assignee: "meera", status: "COMPLETED", priority: "MEDIUM", due: -8 },
    { project: "sponsor", title: "Book the sponsor lounge", assignee: null, status: "TODO", priority: "MEDIUM", due: 12 },
    { project: "sponsor", title: "Write the cold outreach email template", assignee: "isha", status: "TODO", priority: "LOW", due: 9 },
    { project: "sponsor", title: "Confirm GST details for invoicing", assignee: "rohan", status: "TODO", priority: "MEDIUM", due: 4 },

    // Merch — comfortable
    { project: "merch", title: "Final hoodie colourway", assignee: "priya", status: "IN_PROGRESS", priority: "MEDIUM", due: 11 },
    { project: "merch", title: "Get quotes from three printers", assignee: "arjun", status: "TODO", priority: "HIGH", due: 7 },
    { project: "merch", title: "Badge lanyard artwork", assignee: "meera", status: "TODO", priority: "LOW", due: 18 },
    { project: "merch", title: "Stage backdrop dimensions from the venue", assignee: "arjun", status: "COMPLETED", priority: "MEDIUM", due: -3 },
    { project: "merch", title: "Instagram announcement kit", assignee: "meera", status: "IN_PROGRESS", priority: "MEDIUM", due: 14 },
    { project: "merch", title: "Size curve from last year's sales", assignee: "priya", status: "COMPLETED", priority: "LOW", due: -5 },
    { project: "merch", title: "Sticker sheet", assignee: null, status: "TODO", priority: "LOW", due: 22 },

    // Ops — early days
    { project: "ops", title: "Lock the judging rubric", assignee: "kabir", status: "IN_PROGRESS", priority: "HIGH", due: 10 },
    { project: "ops", title: "Confirm venue power and network load", assignee: "dev", status: "TODO", priority: "HIGH", due: 15 },
    { project: "ops", title: "Participant comms schedule", assignee: "isha", status: "TODO", priority: "MEDIUM", due: 20 },
    { project: "ops", title: "Draft the problem statements", assignee: "arjun", status: "TODO", priority: "HIGH", due: 13 },
    { project: "ops", title: "Volunteer shift roster", assignee: "dev", status: "TODO", priority: "MEDIUM", due: 25 },
    { project: "ops", title: "Book the projector and mics", assignee: "arjun", status: "COMPLETED", priority: "LOW", due: -2 },
    { project: "ops", title: "Food and water logistics", assignee: "isha", status: "TODO", priority: "MEDIUM", due: 28 },
    { project: "ops", title: "Judging panel invitations", assignee: "kabir", status: "IN_PROGRESS", priority: "HIGH", due: 16 },
  ];

  const createdTasks: Array<{ id: string; projectId: string; title: string; assignee: string | null; status: string }> = [];

  for (const t of tasks) {
    const created = await prisma.task.create({
      data: {
        projectId: projectIds[t.project],
        assigneeId: t.assignee ? users[t.assignee].id : null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due === null ? null : at(t.due),
        completedAt: t.status === "COMPLETED" ? at((t.due ?? 0) - 1) : null,
      },
    });
    createdTasks.push({
      id: created.id,
      projectId: created.projectId,
      title: created.title,
      assignee: t.assignee,
      status: t.status,
    });
  }

  // Activity should not be empty on first load. Reconstruct a plausible history
  // for the work that has already moved.
  const admin = users.aditi.id;

  for (const key of Object.keys(projectIds)) {
    await prisma.auditLog.create({
      data: {
        actorId: admin,
        action: "project.created",
        entityType: "Project",
        entityId: projectIds[key],
        projectId: projectIds[key],
        createdAt: at(-30),
      },
    });
  }

  for (const [project, person, role] of team) {
    if (role !== "LEAD") continue;
    await prisma.auditLog.create({
      data: {
        actorId: admin,
        action: "team.role_changed",
        entityType: "Membership",
        entityId: `${projectIds[project]}:${users[person].id}`,
        projectId: projectIds[project],
        meta: { to: "LEAD", user: users[person].name },
        createdAt: at(-29),
      },
    });
  }

  let offset = 0;
  for (const t of createdTasks) {
    if (t.status === "TODO" || !t.assignee) continue;
    offset += 1;
    await prisma.auditLog.create({
      data: {
        actorId: users[t.assignee].id,
        action: "task.status_changed",
        entityType: "Task",
        entityId: t.id,
        projectId: t.projectId,
        meta: { from: "TODO", to: t.status === "COMPLETED" ? "IN_PROGRESS" : t.status, title: t.title },
        createdAt: at(-Math.min(20, 1 + offset * 0.6)),
      },
    });
    if (t.status === "COMPLETED") {
      await prisma.auditLog.create({
        data: {
          actorId: users[t.assignee].id,
          action: "task.status_changed",
          entityType: "Task",
          entityId: t.id,
          projectId: t.projectId,
          meta: { from: "IN_PROGRESS", to: "COMPLETED", title: t.title },
          createdAt: at(-Math.min(18, offset * 0.5)),
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    memberships: await prisma.membership.count(),
    tasks: await prisma.task.count(),
    activity: await prisma.auditLog.count(),
  };

  process.stdout.write(
    [
      "",
      "Seeded.",
      `  users ${counts.users}  projects ${counts.projects}  memberships ${counts.memberships}  tasks ${counts.tasks}  activity ${counts.activity}`,
      "",
      "Sign in with any of these — the password is the same for all:",
      `  Admin         aditi@envision.club   ${PASSWORD}`,
      `  Project lead  rohan@envision.club   ${PASSWORD}   (leads the website, follows sponsorship)`,
      `  Member        arjun@envision.club   ${PASSWORD}`,
      "",
    ].join("\n"),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
