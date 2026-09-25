CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp with time zone,
	"default_form_id" uuid,
	"provider_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ssl_status" text,
	"verification_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"synced_revision" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_default_form_id_forms_id_fk" FOREIGN KEY ("default_form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_workspace_hostname_unique" ON "custom_domains" USING btree ("workspace_id","hostname");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_domains_verified_hostname_unique" ON "custom_domains" USING btree ("hostname") WHERE "custom_domains"."verified_at" is not null;