-- Site core. Written for this build because Action-CEO-Schema-v3.zip was not supplied; swap in the zip's file if it differs.
-- Rules: every table starts with site_. Never rebuild a parent table: ALTER TABLE ADD COLUMN only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS site_contacts (
  id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, org TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_inquiry_types (id INTEGER PRIMARY KEY, label TEXT NOT NULL UNIQUE, sort INTEGER NOT NULL);
INSERT OR IGNORE INTO site_inquiry_types (id, label, sort) VALUES
  (1,'Speaking',1),(2,'Hosting or guest spot',2),(3,'LFG partnership',3),(4,'Sponsorship',4),(5,'Media',5),(6,'Other',6);
CREATE TABLE IF NOT EXISTS site_consent_texts (version TEXT PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL);
INSERT OR IGNORE INTO site_consent_texts (version, body, created_at) VALUES
  ('2026-11-15', 'OK to email me back about this. See the privacy page.', '2026-11-15T00:00:00Z');
CREATE TABLE IF NOT EXISTS site_form_submissions (
  id INTEGER PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES site_contacts(id),
  inquiry_type INTEGER NOT NULL REFERENCES site_inquiry_types(id),
  message TEXT NOT NULL,
  consent_version TEXT NOT NULL REFERENCES site_consent_texts(version),
  ip_hash TEXT NOT NULL, ip_hash_salt_version INTEGER NOT NULL,
  user_agent TEXT, country TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS site_form_submissions_ip ON site_form_submissions (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS site_form_submissions_contact ON site_form_submissions (contact_id);

CREATE TABLE IF NOT EXISTS site_pipeline_channels (id TEXT PRIMARY KEY, handle TEXT NOT NULL, name TEXT NOT NULL);
INSERT OR IGNORE INTO site_pipeline_channels (id, handle, name) VALUES
  ('UC6xEgfbdmzk_ybYIilWRRoA','@ActionCrypto','ActionCrypto'),('TODO_CHANNEL_ID_LFGACTION','@LFGAction','LFGAction');
CREATE TABLE IF NOT EXISTS site_pipeline_ingest_rules (
  channel_id TEXT NOT NULL REFERENCES site_pipeline_channels(id), kind TEXT NOT NULL CHECK (kind IN ('video','live','short')),
  enabled INTEGER NOT NULL CHECK (enabled IN (0,1)), PRIMARY KEY (channel_id, kind)
);
INSERT OR IGNORE INTO site_pipeline_ingest_rules (channel_id, kind, enabled)
  SELECT id, k.kind, k.enabled FROM site_pipeline_channels, (SELECT 'video' AS kind, 1 AS enabled UNION ALL SELECT 'live', 1 UNION ALL SELECT 'short', 0) k;
CREATE TABLE IF NOT EXISTS site_pipeline_detections (
  video_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES site_pipeline_channels(id),
  title TEXT NOT NULL, published_at TEXT NOT NULL, detected_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_pipeline_jobs (
  id INTEGER PRIMARY KEY, video_id TEXT NOT NULL UNIQUE REFERENCES site_pipeline_detections(video_id),
  status TEXT NOT NULL CHECK (status IN ('pending','waiting_live','waiting_captions','drafted','pr_open','skipped','failed')),
  step TEXT, kind TEXT, post_slug TEXT, pr_url TEXT, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS site_pipeline_jobs_status ON site_pipeline_jobs (status, updated_at);
CREATE TABLE IF NOT EXISTS site_pipeline_job_attempts (
  id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL REFERENCES site_pipeline_jobs(id),
  step TEXT NOT NULL, ok INTEGER NOT NULL CHECK (ok IN (0,1)), detail TEXT, run_url TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS site_pipeline_job_attempts_job ON site_pipeline_job_attempts (job_id);
