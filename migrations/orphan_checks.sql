-- Run daily. Any row returned is a Telegram alert.
SELECT 'submission_without_contact' AS problem, s.id AS ref FROM site_form_submissions s LEFT JOIN site_contacts c ON c.id = s.contact_id WHERE c.id IS NULL
UNION ALL SELECT 'submission_without_type', s.id FROM site_form_submissions s LEFT JOIN site_inquiry_types t ON t.id = s.inquiry_type WHERE t.id IS NULL
UNION ALL SELECT 'submission_without_consent_text', s.id FROM site_form_submissions s LEFT JOIN site_consent_texts t ON t.version = s.consent_version WHERE t.version IS NULL
UNION ALL SELECT 'job_without_detection', j.id FROM site_pipeline_jobs j LEFT JOIN site_pipeline_detections d ON d.video_id = j.video_id WHERE d.video_id IS NULL
UNION ALL SELECT 'attempt_without_job', a.id FROM site_pipeline_job_attempts a LEFT JOIN site_pipeline_jobs j ON j.id = a.job_id WHERE j.id IS NULL
UNION ALL SELECT 'detection_without_channel', d.rowid FROM site_pipeline_detections d LEFT JOIN site_pipeline_channels c ON c.id = d.channel_id WHERE c.id IS NULL
UNION ALL SELECT 'job_stuck_over_24h', j.id FROM site_pipeline_jobs j WHERE j.status IN ('pending','waiting_live','waiting_captions') AND j.updated_at < datetime('now','-24 hours');
