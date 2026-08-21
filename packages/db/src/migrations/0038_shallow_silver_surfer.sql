ALTER TABLE "protection_risk_report" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "protection_risk_immutable_row"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Avin Check risk records are append-only or immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "protection_risk_evidence_immutable_trigger"
BEFORE UPDATE OR DELETE ON "protection_risk_evidence"
FOR EACH ROW
EXECUTE FUNCTION "protection_risk_immutable_row"();--> statement-breakpoint
CREATE TRIGGER "protection_risk_derivative_immutable_trigger"
BEFORE UPDATE OR DELETE ON "protection_risk_evidence_derivative"
FOR EACH ROW
EXECUTE FUNCTION "protection_risk_immutable_row"();--> statement-breakpoint
CREATE TRIGGER "protection_risk_history_append_only_trigger"
BEFORE UPDATE OR DELETE ON "protection_risk_report_history"
FOR EACH ROW
EXECUTE FUNCTION "protection_risk_immutable_row"();
