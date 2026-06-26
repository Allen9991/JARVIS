import { date, index, pgEnum, pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { users } from './users';

export const licenceTypeEnum = pgEnum('licence_type', [
  'lbp',
  'electrician',
  'plumber',
  'gasfitter',
  'drainlayer',
  'site_safe',
  'asbestos_class_a',
  'asbestos_class_b',
  'qbcc',
  'nsw_fair_trading',
  'vic_vba',
  'wa_bsb',
]);

export const licenceStatusEnum = pgEnum('licence_status', [
  'active',
  'expired',
  'suspended',
  'pending',
]);

export const licences = pgTable(
  'licences',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    orgId:           uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    holderUserId:    uuid('holder_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    licenceType:     licenceTypeEnum('licence_type').notNull(),
    licenceNumber:   text('licence_number').notNull(),
    classOrCategory: text('class_or_category'),
    issuingBody:     text('issuing_body').notNull(),
    jurisdiction:    text('jurisdiction').notNull(),
    issuedAt:        date('issued_at'),
    expiresAt:       date('expires_at'),
    cpd_required:    boolean('cpd_required').notNull().default(false),
    cpdCompletedAt:  date('cpd_completed_at'),
    status:          licenceStatusEnum('status').notNull().default('active'),
    createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx:        index('licences_org_id_idx').on(table.orgId),
    holderUserIdIdx: index('licences_holder_user_id_idx').on(table.holderUserId),
    expiresAtIdx:    index('licences_expires_at_idx').on(table.expiresAt),
    statusIdx:       index('licences_status_idx').on(table.status),
  }),
);

export type Licence    = typeof licences.$inferSelect;
export type NewLicence = typeof licences.$inferInsert;
