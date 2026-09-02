ALTER TABLE classroom_events ADD COLUMN client_request_id TEXT;
ALTER TABLE classroom_events ADD COLUMN request_fingerprint TEXT;

CREATE UNIQUE INDEX uq_classroom_events_owner_request
  ON classroom_events (owner_teacher_id, client_request_id)
  WHERE owner_teacher_id IS NOT NULL AND client_request_id IS NOT NULL;
