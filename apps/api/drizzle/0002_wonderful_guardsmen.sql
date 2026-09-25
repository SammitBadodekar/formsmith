CREATE SEQUENCE domain_route_revision AS bigint;
--> statement-breakpoint
ALTER TABLE "custom_domains" ADD COLUMN "route_revision" bigint DEFAULT nextval('domain_route_revision') NOT NULL;