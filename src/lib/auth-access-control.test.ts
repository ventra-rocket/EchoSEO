import { describe, expect, it } from "vitest";
import {
  ownerAc,
  adminAc,
  memberAc,
} from "better-auth/plugins/organization/access";
import { roles } from "./auth-access-control";

describe("organization roles", () => {
  it("makes owner/admin/member/editor/viewer assignable", () => {
    // Better Auth can only assign a role that is defined here; dropping editor or
    // viewer would silently make the read-only seat uninvitable.
    expect(Object.keys(roles).toSorted()).toEqual([
      "admin",
      "editor",
      "member",
      "owner",
      "viewer",
    ]);
  });

  it("grants editor/viewer only member-level org permissions", () => {
    // Pin the authorization, not just the names: a typo like `editor: adminAc`
    // would hand editors invite/remove/org-update. editor and viewer must carry
    // the non-managing member permission set; owner/admin keep management.
    expect(roles.owner).toBe(ownerAc);
    expect(roles.admin).toBe(adminAc);
    expect(roles.member).toBe(memberAc);
    expect(roles.editor).toBe(memberAc);
    expect(roles.viewer).toBe(memberAc);
  });
});
