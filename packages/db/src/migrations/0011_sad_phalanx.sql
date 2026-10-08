CREATE TABLE "calendly_connection" (
	"user_id" text PRIMARY KEY NOT NULL,
	"owner_uri" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendly_connection" ADD CONSTRAINT "calendly_connection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;