import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ORG_ROLES, SUPPORTED_JURISDICTIONS } from "@atlas/shared";

import { protectedProcedure, router } from "../trpc/init";

const orgRoleSchema = z.enum(ORG_ROLES);
const jurisdictionSchema = z.enum(SUPPORTED_JURISDICTIONS);

export const orgRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        jurisdiction: jurisdictionSchema
      })
    )
    .mutation(async () => {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Organisation creation is waiting on the database schema."
      });
    }),

  invite: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        email: z.string().email(),
        role: orgRoleSchema
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.requireOrgMember(input.orgId);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Organisation invites are waiting on membership persistence."
      });
    }),

  acceptInvite: protectedProcedure
    .input(
      z.object({
        token: z.string().min(16)
      })
    )
    .mutation(async () => {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Invite acceptance is waiting on membership persistence."
      });
    })
});
