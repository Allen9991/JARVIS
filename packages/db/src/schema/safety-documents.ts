import { boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organisations } from './organisations';
import { jobs } from './jobs';

export const safetyDocTypeEnum = pgEnum('safety_doc_type', [
  'sssp',
  'swms',
  'hazard_register',
  'toolbox_talk',
  'jsa',
]);

export const safetyDocuments = pgTable(
  'safety_documents',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    orgId:         uuid('org_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    jobId:         uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    docType:       safetyDocTypeEnum('doc_type').notNull(),
    generatedByAi: boolean('generated_by_ai').notNull().default(false),
    contentJson:   jsonb('content_json'),
    pdfUrl:        text('pdf_url'),
    approvedAt:    timestamp('approved_at', { withTimezone: true }),
    expiresAt:     date('expires_at'),
    createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdIdx:     index('safety_documents_org_id_idx').on(table.orgId),
    jobIdIdx:     index('safety_documents_job_id_idx').on(table.jobId),
    expiresAtIdx: index('safety_documents_expires_at_idx').on(table.expiresAt),
  }),
);

export type SafetyDocument    = typeof safetyDocuments.$inferSelect;
export type NewSafetyDocument = typeof safetyDocuments.$inferInsert;
