CREATE TABLE "agent_revocations" (
	"owner_id" text NOT NULL,
	"client_id" text NOT NULL,
	"revoked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_revocations_owner_id_client_id_pk" PRIMARY KEY("owner_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "agent_revocations" ADD CONSTRAINT "agent_revocations_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;