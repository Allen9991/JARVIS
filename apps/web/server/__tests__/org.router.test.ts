import { TRPCError } from "@trpc/server";
import { describe, expect, it, vi } from "vitest";

import type { AtlasDbClient } from "@atlas/db";

import type { OrgMembership } from "@/server/middleware/requireOrgMember";
import { appRouter } from "@/server/routers/root";
import { createCallerFactory } from "@/server/trpc/init";
import type { TrpcContext } from "@/server/trpc/context";

// Valid RFC 4122 UUIDs for use as tRPC inputs (Zod v4 enforces strict format).
// Version nibble = 4 ([1-8] allowed), variant nibble = 8 ([89abAB] allowed).
const OWNER_UID = "00000000-0000-4000-8000-000000000002";
const MEMBER_UID = "00000000-0000-4000-8000-000000000003";
const STRANGER_UID = "00000000-0000-4000-8000-000000000099";
const ORG_ID = "00000000-0000-4000-8000-000000000001";
const NEW_ORG_ID = "00000000-0000-4000-8000-000000000010";

const createCaller = createCallerFactory(appRouter);

// ── DB mock helpers ───────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows)
      })
    })
  };
}

const MOCK_ORG = {
  id: NEW_ORG_ID,
  name: "Acme Ltd",
  jurisdiction: "nz",
  entityType: null,
  industry: null,
  gstRegistered: false,
  gstNumber: null,
  abn: null,
  nzbn: null,
  staffCount: 1,
  businessProfileJson: null,
  voiceProfileJson: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const MOCK_MEMBERSHIP = {
  userId: MEMBER_UID,
  orgId: ORG_ID,
  role: "member" as const,
  invitedAt: new Date(),
  acceptedAt: new Date()
};

// Returns a chain where .values() may chain .returning() (for org insert)
// or be awaited directly (for membership/audit_log inserts).
function makeInsertChain(returningRows: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(returningRows)
    })
  };
}

function makeInsertNoReturn() {
  return {
    values: vi.fn().mockResolvedValue([])
  };
}

// ── Context factories ─────────────────────────────────────────────────────────

function ctxWith(
  uid: string,
  overrides: {
    requireOrgMemberResult?: OrgMembership | TRPCError;
    db?: Partial<AtlasDbClient>;
  } = {}
): TrpcContext {
  const requireOrgMemberMock =
    overrides.requireOrgMemberResult instanceof TRPCError
      ? vi.fn().mockRejectedValue(overrides.requireOrgMemberResult)
      : overrides.requireOrgMemberResult
        ? vi.fn().mockResolvedValue(overrides.requireOrgMemberResult)
        : vi.fn().mockRejectedValue(
            new TRPCError({ code: "FORBIDDEN", message: "Not a member." })
          );

  return {
    auth: { uid },
    db: (overrides.db ?? {}) as AtlasDbClient,
    orgId: null,
    requireOrgMember: requireOrgMemberMock
  };
}

// ── org.create tests ──────────────────────────────────────────────────────────

describe("org.create", () => {
  it("creates an org and returns it within a transaction", async () => {
    let insertCallCount = 0;
    const mockTx = {
      insert: vi.fn().mockImplementation(() => {
        insertCallCount++;
        if (insertCallCount === 1) {
          // organisations insert — needs .returning()
          return makeInsertChain([MOCK_ORG]);
        }
        // orgMemberships and auditLog inserts — no .returning()
        return makeInsertNoReturn();
      })
    };
    const db = {
      transaction: vi.fn().mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx)
      )
    } as unknown as AtlasDbClient;

    const caller = createCaller(ctxWith(OWNER_UID, { db }));
    const result = await caller.org.create({ name: "Acme Ltd", jurisdiction: "nz" });

    expect(result.id).toBe(NEW_ORG_ID);
    expect(result.name).toBe("Acme Ltd");
    expect(mockTx.insert).toHaveBeenCalledTimes(3); // org + membership + audit_log
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = createCaller({
      auth: null,
      db: {} as AtlasDbClient,
      orgId: null,
      requireOrgMember: vi.fn()
    });

    await expect(
      caller.org.create({ name: "Acme Ltd", jurisdiction: "nz" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates input — name too short", async () => {
    const caller = createCaller(ctxWith(OWNER_UID));
    await expect(
      caller.org.create({ name: "X", jurisdiction: "nz" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ── org.invite — authz matrix ─────────────────────────────────────────────────

describe("org.invite — FORBIDDEN cases", () => {
  it("non-member gets FORBIDDEN", async () => {
    const caller = createCaller(
      ctxWith(STRANGER_UID, {
        requireOrgMemberResult: new TRPCError({ code: "FORBIDDEN", message: "Not a member." })
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "new@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("plain member cannot invite — gets FORBIDDEN", async () => {
    const caller = createCaller(
      ctxWith(MEMBER_UID, {
        requireOrgMemberResult: { userId: MEMBER_UID, orgId: ORG_ID, role: "member" }
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "new@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("advisor cannot invite — gets FORBIDDEN", async () => {
    const caller = createCaller(
      ctxWith(MEMBER_UID, {
        requireOrgMemberResult: { userId: MEMBER_UID, orgId: ORG_ID, role: "advisor" }
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "new@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("org.invite — owner / admin can invite", () => {
  function makeInviteDb(userRows: unknown[], existingMembershipRows: unknown[]) {
    let selectCallCount = 0;
    const sequences = [userRows, existingMembershipRows];

    return {
      select: vi.fn().mockImplementation(() => {
        const rows = sequences[selectCallCount] ?? [];
        selectCallCount++;
        return makeSelectChain(rows);
      }),
      transaction: vi.fn().mockImplementation(
        (fn: (tx: { insert: ReturnType<typeof vi.fn> }) => Promise<unknown>) => {
          const tx = { insert: vi.fn().mockReturnValue(makeInsertNoReturn()) };
          return fn(tx);
        }
      )
    } as unknown as AtlasDbClient;
  }

  it("owner can invite an existing user", async () => {
    const db = makeInviteDb(
      [{ id: STRANGER_UID }], // user exists
      [] // no existing membership
    );

    const caller = createCaller(
      ctxWith(OWNER_UID, {
        requireOrgMemberResult: { userId: OWNER_UID, orgId: ORG_ID, role: "owner" },
        db
      })
    );

    const result = await caller.org.invite({
      orgId: ORG_ID,
      email: "newmember@example.com",
      role: "member"
    });

    expect(result.inviteeId).toBe(STRANGER_UID);
    expect(result.role).toBe("member");
  });

  it("admin can invite an existing user", async () => {
    const db = makeInviteDb([{ id: STRANGER_UID }], []);

    const caller = createCaller(
      ctxWith(MEMBER_UID, {
        requireOrgMemberResult: { userId: MEMBER_UID, orgId: ORG_ID, role: "admin" },
        db
      })
    );

    const result = await caller.org.invite({
      orgId: ORG_ID,
      email: "newmember@example.com",
      role: "member"
    });

    expect(result.inviteeId).toBe(STRANGER_UID);
  });

  it("returns NOT_FOUND when invitee email has no account", async () => {
    const db = makeInviteDb([], []); // user not found

    const caller = createCaller(
      ctxWith(OWNER_UID, {
        requireOrgMemberResult: { userId: OWNER_UID, orgId: ORG_ID, role: "owner" },
        db
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "nobody@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns BAD_REQUEST when user is already an accepted member", async () => {
    const db = makeInviteDb(
      [{ id: MEMBER_UID }],
      [{ acceptedAt: new Date() }] // already accepted
    );

    const caller = createCaller(
      ctxWith(OWNER_UID, {
        requireOrgMemberResult: { userId: OWNER_UID, orgId: ORG_ID, role: "owner" },
        db
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "alex.wire@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns BAD_REQUEST when a pending invite already exists", async () => {
    const db = makeInviteDb(
      [{ id: STRANGER_UID }],
      [{ acceptedAt: null }] // pending invite
    );

    const caller = createCaller(
      ctxWith(OWNER_UID, {
        requireOrgMemberResult: { userId: OWNER_UID, orgId: ORG_ID, role: "owner" },
        db
      })
    );

    await expect(
      caller.org.invite({ orgId: ORG_ID, email: "pending@example.com", role: "member" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ── org.acceptInvite tests ────────────────────────────────────────────────────

describe("org.acceptInvite", () => {
  it("flips accepted_at for a pending invite and returns the membership", async () => {
    const acceptedMembership = { ...MOCK_MEMBERSHIP, acceptedAt: new Date() };
    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([acceptedMembership])
          })
        })
      }),
      insert: vi.fn().mockReturnValue(makeInsertNoReturn())
    };

    const db = {
      transaction: vi.fn().mockImplementation(
        (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      )
    } as unknown as AtlasDbClient;

    const caller = createCaller(ctxWith(MEMBER_UID, { db }));
    const result = await caller.org.acceptInvite({ orgId: ORG_ID });

    expect(result.acceptedAt).toBeTruthy();
    expect(mockTx.update).toHaveBeenCalledTimes(1);
    expect(mockTx.insert).toHaveBeenCalledTimes(1); // audit_log
  });

  it("returns NOT_FOUND when there is no pending invite", async () => {
    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]) // no rows updated
          })
        })
      }),
      insert: vi.fn()
    };

    const db = {
      transaction: vi.fn().mockImplementation(
        (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
      )
    } as unknown as AtlasDbClient;

    const caller = createCaller(ctxWith(STRANGER_UID, { db }));

    await expect(caller.org.acceptInvite({ orgId: ORG_ID })).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = createCaller({
      auth: null,
      db: {} as AtlasDbClient,
      orgId: null,
      requireOrgMember: vi.fn()
    });

    await expect(caller.org.acceptInvite({ orgId: ORG_ID })).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });
});
