import { TRPCError } from "@trpc/server";

import { and, eq, isNotNull, orgMemberships } from "@atlas/db";
import type { OrgRole } from "@atlas/shared";

import type { TrpcContext } from "@/server/trpc/context";

export type OrgMembership = {
  orgId: string;
  role: OrgRole;
  userId: string;
};

// Uses the Drizzle postgres connection (bypasses RLS by default).
// Safe because: userId is sourced exclusively from ctx.auth.uid — a Supabase-validated
// JWT claim, never from user input. The accepted_at IS NOT NULL guard rejects pending invites.
// The service-role connection is required anyway for membership writes (no authenticated
// write policies exist), so we use it consistently here for reads too.
export function requireOrgMember(orgId: string) {
  return async function requireOrgMemberForContext(
    ctx: TrpcContext
  ): Promise<OrgMembership> {
    if (!ctx.auth) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to perform this action."
      });
    }

    const [row] = await ctx.db
      .select({ role: orgMemberships.role })
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.userId, ctx.auth.uid),
          eq(orgMemberships.orgId, orgId),
          isNotNull(orgMemberships.acceptedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organisation."
      });
    }

    return { userId: ctx.auth.uid, orgId, role: row.role };
  };
}
