-- Custom SQL migration file, put your code below! --
-- Additive compatibility cleanup for databases with the pre-ADR role baseline.
DROP TABLE IF EXISTS "public"."user_role";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."app_role";
