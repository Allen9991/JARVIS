import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const organisations = pgTable(
  'organisations',
  {
    id:                  uuid('id').primaryKey().defaultRandom(),
    name:                text('name').notNull(),
    entityType:          text('entity_type'),
    industry:            text('industry'),
    jurisdiction:        text('jurisdiction').notNull(),
    gstRegistered:       boolean('gst_registered').notNull().default(false),
    gstNumber:           text('gst_number'),
    abn:                 text('abn'),
    nzbn:                text('nzbn'),
    staffCount:          integer('staff_count').notNull().default(1),
    businessProfileJson: jsonb('business_profile_json'),
    voiceProfileJson:    jsonb('voice_profile_json'),
    createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('organisations_name_idx').on(table.name),
  }),
);

export type Organisation    = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
