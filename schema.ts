import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
export const knowledge = pgTable('knowledge', {
  id: serial().primaryKey(),
  notebook: text('notebook').notNull(),
  content: text('content').notNull(),
  category: text('category').default('reference').notNull(),
  title: text('title').default('').notNull(),
  year: text('year').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Published source documents are read-only; personal notes stay in knowledge.
export const publishedPapers = pgTable('published_papers', {
  id: text('id').primaryKey(),
  year: integer('year').notNull(),
  track: text('track').notNull(),
  session: integer('session').notNull(),
  pageStart: integer('page_start').notNull(),
  pageEnd: integer('page_end').notNull(),
  pdfPath: text('pdf_path').notNull(),
  questions: text('questions').default('').notNull(),
  answers: text('answers').default('').notNull(),
});
