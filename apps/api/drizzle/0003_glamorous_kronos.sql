CREATE TABLE "sheet_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"values" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "next_row" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "sheet_deliveries" ADD CONSTRAINT "sheet_deliveries_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sheet_deliveries" ADD CONSTRAINT "sheet_deliveries_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sheet_delivery_submission_unique" ON "sheet_deliveries" USING btree ("integration_id","submission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sheet_delivery_row_unique" ON "sheet_deliveries" USING btree ("integration_id","row_number");