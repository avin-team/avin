CREATE OR REPLACE FUNCTION "protection_risk_immutable_row"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	report_status "protection_risk_report_status";
BEGIN
	IF TG_TABLE_NAME = 'protection_risk_evidence' THEN
		SELECT status INTO report_status FROM "protection_risk_report" WHERE id = OLD.report_id;
		IF report_status IS NULL OR report_status = 'DRAFT' THEN
			RETURN OLD;
		END IF;
	ELSIF TG_TABLE_NAME = 'protection_risk_evidence_derivative' THEN
		SELECT r.status INTO report_status
		FROM "protection_risk_evidence" e
		LEFT JOIN "protection_risk_report" r ON r.id = e.report_id
		WHERE e.id = OLD.evidence_id;
		IF report_status IS NULL OR report_status = 'DRAFT' THEN
			RETURN OLD;
		END IF;
	ELSIF TG_TABLE_NAME = 'protection_risk_report_history' THEN
		SELECT status INTO report_status FROM "protection_risk_report" WHERE id = OLD.report_id;
		IF report_status IS NULL OR report_status = 'DRAFT' THEN
			RETURN OLD;
		END IF;
	END IF;

	RAISE EXCEPTION 'Avin Check risk records are append-only or immutable';
END;
$$;
