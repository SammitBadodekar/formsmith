DROP INDEX "forms_workspace_updated_idx";--> statement-breakpoint
CREATE INDEX "forms_workspace_created_idx" ON "forms" USING btree ("workspace_id","created_at","id");