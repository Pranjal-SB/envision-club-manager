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
  it("manages club members", () => {
    expect(can(admin, "member.manage")).toBe(true);
  });

  it("creates and deletes projects", () => {
    expect(can(admin, "project.create")).toBe(true);
    expect(can(admin, "project.delete", asOutsider)).toBe(true);
  });

  it("reads club-wide activity", () => {
    expect(can(admin, "activity.viewAll")).toBe(true);
  });

  it("acts on projects it is not a member of", () => {
    expect(can(admin, "task.create", asOutsider)).toBe(true);
    expect(can(admin, "project.view", asOutsider)).toBe(true);
    expect(can(admin, "team.manage", asOutsider)).toBe(true);
  });

  it("moves a task assigned to somebody else", () => {
    expect(
      can(admin, "task.updateStatus", { membership: null, task: { assigneeId: "u-member" } }),
    ).toBe(true);
  });
});

describe("project lead", () => {
  it("manages the team and tasks of its own project", () => {
    expect(can(lead, "team.manage", asLead)).toBe(true);
    expect(can(lead, "task.create", asLead)).toBe(true);
    expect(can(lead, "task.update", asLead)).toBe(true);
    expect(can(lead, "task.delete", asLead)).toBe(true);
    expect(can(lead, "project.update", asLead)).toBe(true);
    expect(can(lead, "project.view", asLead)).toBe(true);
  });

  it("moves any task within its own project", () => {
    expect(
      can(lead, "task.updateStatus", { ...asLead, task: { assigneeId: "someone-else" } }),
    ).toBe(true);
    expect(can(lead, "task.updateStatus", { ...asLead, task: { assigneeId: null } })).toBe(true);
  });

  // The point of putting LEAD on Membership rather than User: leadership does
  // not travel with the person between projects.
  it("has no authority in a project it merely belongs to", () => {
    expect(can(lead, "task.create", asMember)).toBe(false);
    expect(can(lead, "team.manage", asMember)).toBe(false);
    expect(can(lead, "project.update", asMember)).toBe(false);
  });

  it("has no authority in a project it does not belong to", () => {
    expect(can(lead, "task.create", asOutsider)).toBe(false);
    expect(can(lead, "project.view", asOutsider)).toBe(false);
  });

  it("cannot create or delete projects, or manage club members", () => {
    expect(can(lead, "project.create", asLead)).toBe(false);
    expect(can(lead, "project.delete", asLead)).toBe(false);
    expect(can(lead, "member.manage", asLead)).toBe(false);
  });

  it("cannot read club-wide activity", () => {
    expect(can(lead, "activity.viewAll", asLead)).toBe(false);
  });
});

describe("member", () => {
  it("views projects it belongs to", () => {
    expect(can(member, "project.view", asMember)).toBe(true);
  });

  it("moves its own assigned task and no other", () => {
    expect(
      can(member, "task.updateStatus", { ...asMember, task: { assigneeId: member.id } }),
    ).toBe(true);
    expect(
      can(member, "task.updateStatus", { ...asMember, task: { assigneeId: "u-other" } }),
    ).toBe(false);
    expect(can(member, "task.updateStatus", { ...asMember, task: { assigneeId: null } })).toBe(
      false,
    );
    // No task context at all is not a licence to move anything.
    expect(can(member, "task.updateStatus", asMember)).toBe(false);
  });

  it("cannot create, edit, or delete tasks", () => {
    expect(can(member, "task.create", asMember)).toBe(false);
    expect(can(member, "task.update", asMember)).toBe(false);
    expect(can(member, "task.delete", asMember)).toBe(false);
  });

  it("cannot manage the team or the project", () => {
    expect(can(member, "team.manage", asMember)).toBe(false);
    expect(can(member, "project.update", asMember)).toBe(false);
  });
});

describe("outsider", () => {
  it("cannot view a project it does not belong to", () => {
    expect(can(outsider, "project.view", asOutsider)).toBe(false);
  });

  it("cannot move a task even when it is the named assignee", () => {
    expect(
      can(outsider, "task.updateStatus", { membership: null, task: { assigneeId: outsider.id } }),
    ).toBe(false);
  });

  it("cannot do anything project-scoped", () => {
    expect(can(outsider, "task.create", asOutsider)).toBe(false);
    expect(can(outsider, "team.manage", asOutsider)).toBe(false);
    expect(can(outsider, "project.update", asOutsider)).toBe(false);
  });
});
