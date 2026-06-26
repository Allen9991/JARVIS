import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { users } from './users';

export const auditLog = pgTable(
  'audit_log',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    orgId:         uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'restrict' }),
    userId:        uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action:        text('action').notNull(),
    entityType:    text('entity_type').notNull(),
    entityId:      uuid('entity_id'),
    detailsJson:   jsonb('details_json'),
    aiModelUsed:   text('ai_model_used'),
    promptVersion: text('prompt_version'),
    createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx:      index('audit_log_org_id_idx').on(table.orgId),
    createdAtIdx:  index('audit_log_created_at_idx').on(table.createdAt),
    entityTypeIdx: index('audit_log_entity_type_idx').on(table.entityType),
    userIdIdx:     index('audit_log_user_id_idx').on(table.userId),
  }),
);

// audit_log is INSERT-only at the application layer; never UPDATE or DELETE.
export type AuditLogEntry    = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
