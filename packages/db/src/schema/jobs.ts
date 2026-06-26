import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';

export const consentStatusEnum = pgEnum('consent_status', [
  'not_required',
  'exempt',
  'pending',
  'granted',
  'declined',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'draft',
  'active',
  'on_hold',
  'complete',
  'cancelled',
]);

export const jobs = pgTable(
  'jobs',
  {
    id:                      uuid('id').primaryKey().defaultRandom(),
    orgId:                   uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    clientId:                uuid('client_id'),
    address:                 text('address').notNull(),
    scopeDescription:        text('scope_description'),
    buildingAge:             integer('building_age'),
    buildingConsentRequired: boolean('building_consent_required').notNull().default(false),
    consentStatus:           consentStatusEnum('consent_status').notNull().default('not_required'),
    hrcwCategories:          text('hrcw_categories').array(),
    startDate:               date('start_date'),
    status:                  jobStatusEnum('status').notNull().default('draft'),
    createdAt:               timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:               timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx:     index('jobs_org_id_idx').on(table.orgId),
    statusIdx:    index('jobs_status_idx').on(table.status),
    startDateIdx: index('jobs_start_date_idx').on(table.startDate),
  }),
);

export type Job    = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
