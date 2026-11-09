CREATE TABLE "knowledge" (
	"id" serial PRIMARY KEY,
	"notebook" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
