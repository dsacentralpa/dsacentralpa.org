-- Adds a public contact form and a county field on signups.
--
--   npx wrangler d1 execute dsa-list-db --local  --file=./migrations/001_add_contact_and_county.sql
--   npx wrangler d1 execute dsa-list-db --remote --file=./migrations/001_add_contact_and_county.sql
--
-- Safe to run on a live database — only adds.

-- County matters more than ZIP for us: Clearfield County is one Pre-OC territory,
-- and we need to be able to tell who is inside it and who is a neighbor.
ALTER TABLE subscribers ADD COLUMN county TEXT;

CREATE INDEX IF NOT EXISTS idx_subscribers_county ON subscribers(county);

-- Messages from the public contact form. Separate from subscribers: someone can
-- ask a question without joining anything, and should not be added to a list for it.
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  county       TEXT,
  topic        TEXT,
  body         TEXT NOT NULL,
  ip           TEXT,
  user_agent   TEXT,
  handled_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_handled ON messages(handled_at);
