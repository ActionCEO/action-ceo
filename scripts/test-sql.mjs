// Applies the migration to an in-memory SQLite and checks the basics. Run after any schema change.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const db = new DatabaseSync(':memory:');
const migrations = fs.readdirSync('migrations').filter((f) => f.endsWith('.sql')).sort();
for (let i = 0; i < 2; i++) for (const f of migrations) db.exec(fs.readFileSync(`migrations/${f}`, 'utf8')); // every migration must be safe to run twice
const t = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
const fail = (m) => { console.error('SQL test failed: ' + m); process.exit(1); };
if (t.some((n) => !n.startsWith('site_'))) fail('every table must start with site_');
if (db.prepare('SELECT COUNT(*) AS n FROM site_inquiry_types').get().n !== 7) fail('expected 7 inquiry types');
if (db.prepare("SELECT COUNT(*) AS n FROM site_pipeline_ingest_rules WHERE kind = 'short' AND enabled = 1").get().n !== 0) fail('Shorts must be off');
if (db.prepare("PRAGMA table_info(site_form_submissions)").all().some((c) => /^ip$|ip_address/.test(c.name))) fail('raw IP column found');
try { db.exec("INSERT INTO site_form_submissions (contact_id, inquiry_type, message, consent_version, ip_hash, ip_hash_salt_version, created_at) VALUES (999, 1, 'x', '2026-11-15', 'h', 1, 'now')"); fail('orphan submission was accepted'); } catch { /* expected */ }
if (db.prepare(fs.readFileSync('sql/orphan_checks.sql', 'utf8').replace(/^--.*$/gm, '')).all().length) fail('orphan checks returned rows on a clean database');
console.log(`SQL tests passed (${t.length} tables).`);
