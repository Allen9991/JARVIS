import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, auditLog, eq, isNull, orgMemberships, organisations, users } from "@atlas/db";
import { ORG_ROLES, SUPPORTED_JURISDICTIONS } from "@atlas/shared";

import { protectedProcedure, router } from "../trpc/init";

const orgRoleSchema = z.enum(ORG_ROLES);
const jurisdictionSchema = z.enum(SUPPORTED_JURISDICTIONS);

export const orgRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        jurisdiction: jurisdictionSchema,
        entityType: z.string().optional(),
        industry: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.uid;

      return ctx.db.transaction(async (tx) => {
        const [newOrg] = await tx
          .insert(organisations)
          .values({
            name: input.name,
            jurisdiction: input.jurisdiction,
            entityType: input.entityType ?? null,
            industry: input.industry ?? null
          })
          .returning();

        if (!newOrg) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create organisation."
          });
        }

        await tx.insert(orgMemberships).values({
          userId,
          orgId: newOrg.id,
          role: "owner",
          acceptedAt: new Date()
        });

        await tx.insert(auditLog).values({
          orgId: newOrg.id,
          userId,
          action: "org.create",
          entityType: "organisation",
          entityId: newOrg.id,
          detailsJson: { name: newOrg.name, jurisdiction: newOrg.jurisdiction }
        });

        return newOrg;
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
      const membership = await ctx.requireOrgMember(input.orgId);

      if (membership.role !== "owner" && membership.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can invite members."
        });
      }

      // Existing-users-only: the schema FK (user_id → users.id) enforces this at
      // the DB level too. Ask the invitee to sign up before being invited.
      const [invitee] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!invitee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No account found for this email address. Ask them to sign up first."
        });
      }

      const [existing] = await ctx.db
        .select({ acceptedAt: orgMemberships.acceptedAt })
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.userId, invitee.id),
            eq(orgMemberships.orgId, input.orgId)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            existing.acceptedAt != null
              ? "This user is already a member of this organisation."
              : "An invite has already been sent to this user."
        });
      }

      await ctx.db.transaction(async (tx) => {
        await tx.insert(orgMemberships).values({
          userId: invitee.id,
          orgId: input.orgId,
          role: input.role
          // acceptedAt omitted — null signals a pending invite
        });

        // TODO: send invite email via Resend here once RESEND_API_KEY is wired.
        // await sendInviteEmail({ to: input.email, orgId: input.orgId, inviterUid: ctx.auth.uid });

        await tx.insert(auditLog).values({
          orgId: input.orgId,
          userId: ctx.auth.uid,
          action: "org.invite",
          entityType: "org_membership",
          entityId: invitee.id,
          detailsJson: { inviteeEmail: input.email, role: input.role }
        });
      });

      return { inviteeId: invitee.id, orgId: input.orgId, role: input.role };
    }),

  acceptInvite: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid()
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const updated = await tx
          .update(orgMemberships)
          .set({ acceptedAt: new Date() })
          .where(
            and(
              eq(orgMemberships.userId, ctx.auth.uid),
              eq(orgMemberships.orgId, input.orgId),
              isNull(orgMemberships.acceptedAt)
            )
          )
          .returning();

        if (updated.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No pending invite found for this organisation."
          });
        }

        await tx.insert(auditLog).values({
          orgId: input.orgId,
          userId: ctx.auth.uid,
          action: "org.acceptInvite",
          entityType: "org_membership",
          entityId: ctx.auth.uid,
          detailsJson: { orgId: input.orgId }
        });

        return updated[0]!;
      });
    })
});
