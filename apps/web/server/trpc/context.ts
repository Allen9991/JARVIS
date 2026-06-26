import type { AtlasDbClient } from "@atlas/db";

import { getDbClient } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  requireOrgMember,
  type OrgMembership
} from "@/server/middleware/requireOrgMember";

export type TrpcContext = {
  auth: {
    uid: string;
  } | null;
  db: AtlasDbClient;
  orgId: string | null;
  requireOrgMember: (orgId: string) => Promise<OrgMembership>;
};

export async function createTrpcContext(): Promise<TrpcContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const db = getDbClient();

  const ctx: TrpcContext = {
    auth: user ? { uid: user.id } : null,
    db,
    orgId: null,
    async requireOrgMember(orgId) {
      return requireOrgMember(orgId)(ctx);
    }
  };

  return ctx;
}
