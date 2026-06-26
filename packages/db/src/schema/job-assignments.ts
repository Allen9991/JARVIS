import { date, index, numeric, pgEnum, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { users } from './users';

export const assignmentRoleEnum = pgEnum('assignment_role', [
  'lead',
  'apprentice',
  'supervisor',
  'subbie',
]);

export const jobAssignments = pgTable(
  'job_assignments',
  {
    jobId:        uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role:         assignmentRoleEnum('role').notNull().default('lead'),
    scheduledFor: date('scheduled_for'),
    hoursLogged:  numeric('hours_logged', { precision: 6, scale: 2 }).notNull().default('0'),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk:      primaryKey({ columns: [table.jobId, table.userId] }),
    jobIdx:  index('job_assignments_job_id_idx').on(table.jobId),
    userIdx: index('job_assignments_user_id_idx').on(table.userId),
  }),
);

export type JobAssignment    = typeof jobAssignments.$inferSelect;
export type NewJobAssignment = typeof jobAssignments.$inferInsert;
