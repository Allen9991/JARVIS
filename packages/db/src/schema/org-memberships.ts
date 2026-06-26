import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users';
import { organisations } from './organisations';
import { users } from './users';

export const orgMemberships = pgTable(
  'org_memberships',
  {
    userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    orgId:      uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    role:       userRoleEnum('role').notNull().default('member'),
    invitedAt:  timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => ({
    pk:       primaryKey({ columns: [table.userId, table.orgId] }),
    userIdx:  index('org_memberships_user_id_idx').on(table.userId),
    orgIdx:   index('org_memberships_org_id_idx').on(table.orgId),
  }),
);

export type OrgMembership    = typeof orgMemberships.$inferSelect;
export type NewOrgMembership = typeof orgMemberships.$inferInsert;
