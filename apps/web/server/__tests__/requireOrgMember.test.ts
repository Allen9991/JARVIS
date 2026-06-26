import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AtlasDbClient } from "@atlas/db";

import { requireOrgMember } from "@/server/middleware/requireOrgMember";
import type { TrpcContext } from "@/server/trpc/context";

// Valid RFC 4122 UUIDs (version=4, variant=8). Mirrors seed.sql ids but with
// correct format nibbles so they pass Zod v4's strict uuid() validation.
const OWNER_UID = "00000000-0000-4000-8000-000000000002";
const ORG_ID = "00000000-0000-4000-8000-000000000001";

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows)
      })
    })
  };
}

function makeDb(membershipRows: unknown[]): AtlasDbClient {
  return {
    select: vi.fn().mockReturnValue(makeSelectChain(membershipRows))
  } as unknown as AtlasDbClient;
}

function makeCtx(uid: string | null, db: AtlasDbClient): TrpcContext {
  return {
    auth: uid ? { uid } : null,
    db,
    orgId: null,
    requireOrgMember: vi.fn()
  };
}

describe("requireOrgMember", () => {
  it("throws UNAUTHORIZED when ctx.auth is null", async () => {
    const ctx = makeCtx(null, makeDb([]));
    await expect(requireOrgMember(ORG_ID)(ctx)).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("throws FORBIDDEN when user has no membership in the org", async () => {
    const ctx = makeCtx(OWNER_UID, makeDb([]));
    await expect(requireOrgMember(ORG_ID)(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("throws FORBIDDEN for a pending invite (accepted_at IS NULL — filtered by query)", async () => {
    // The WHERE clause includes accepted_at IS NOT NULL, so pending invites
    // return zero rows — same as not being a member.
    const ctx = makeCtx(OWNER_UID, makeDb([]));
    await expect(requireOrgMember(ORG_ID)(ctx)).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("returns membership with real role for an accepted member (owner)", async () => {
    const ctx = makeCtx(OWNER_UID, makeDb([{ role: "owner" }]));
    const result = await requireOrgMember(ORG_ID)(ctx);
    expect(result).toEqual({ userId: OWNER_UID, orgId: ORG_ID, role: "owner" });
  });

  it("returns membership with real role for an accepted member (member)", async () => {
    const ctx = makeCtx(OWNER_UID, makeDb([{ role: "member" }]));
    const result = await requireOrgMember(ORG_ID)(ctx);
    expect(result).toEqual({ userId: OWNER_UID, orgId: ORG_ID, role: "member" });
  });

  it("returns membership with real role for an accepted member (admin)", async () => {
    const ctx = makeCtx(OWNER_UID, makeDb([{ role: "admin" }]));
    const result = await requireOrgMember(ORG_ID)(ctx);
    expect(result).toEqual({ userId: OWNER_UID, orgId: ORG_ID, role: "admin" });
  });
});

describe("requireOrgMember — TRPCError shape", () => {
  it("FORBIDDEN error is a TRPCError instance", async () => {
    const ctx = makeCtx(OWNER_UID, makeDb([]));
    const err = await requireOrgMember(ORG_ID)(ctx).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe("FORBIDDEN");
  });
});
