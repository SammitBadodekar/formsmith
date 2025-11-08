CREATE TABLE "form" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"image" text,
	"logo" text,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp,
	"is_published" boolean,
	"subdomain" text,
	"path" text,
	"customizations" jsonb,
	CONSTRAINT "form_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "form_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_template" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"data" jsonb,
	"customizations" jsonb,
	"creator_id" text NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "published_form" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"image" text,
	"logo" text,
	"form_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp,
	"updated_at" timestamp,
	"subdomain" text,
	"path" text,
	"customizations" jsonb,
	CONSTRAINT "published_form_form_id_unique" UNIQUE("form_id"),
	CONSTRAINT "published_form_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form" ADD CONSTRAINT "form_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form" ADD CONSTRAINT "form_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_submission" ADD CONSTRAINT "form_submission_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_template" ADD CONSTRAINT "form_template_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_form" ADD CONSTRAINT "published_form_form_id_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_form" ADD CONSTRAINT "published_form_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_form" ADD CONSTRAINT "published_form_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;