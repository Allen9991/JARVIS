import type { TrpcContext } from "@/server/trpc/context";

export type OrgMembership = {
  orgId: string;
  role: "OWNER";
  userId: string;
};

export function requireOrgMember(orgId: string) {
  return async function requireOrgMemberForContext(
    ctx: TrpcContext,
  ): Promise<OrgMembership> {
    void ctx;
    // TODO: replace stub with real Supabase membership check — Claude Code owns the real implementation
    return { userId: "stub", orgId, role: "OWNER" };
  };
}
