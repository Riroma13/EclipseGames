CREATE UNIQUE INDEX uq_assessment_contexts_active_group_normalized_name
ON assessment_contexts (group_id, lower(trim(name)))
WHERE archived_at IS NULL;
