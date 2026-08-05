-- Central PA DSA — contact list schema (Cloudflare D1 / SQLite)
-- Apply with:  npx wrangler d1 execute dsa-list-db --remote --file=./schema.sql
--
-- Design notes:
--   * email and phone are tracked as SEPARATE channels with separate consent state.
--     A person can confirm email and never confirm SMS. This matters legally: TCPA
--     consent for automated texts is its own thing, not implied by an email signup.
--   * consent_events is an append-only audit log. Never UPDATE or DELETE from it.
--     If a carrier or a member ever asks "prove this person opted in", this table
--     is the answer: timestamp, IP, user agent, and the exact consent wording shown.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subscribers (
  id                  TEXT PRIMARY KEY,
  first_name          TEXT,
  last_name           TEXT,

  email               TEXT UNIQUE,
  phone               TEXT UNIQUE,          -- always stored E.164, e.g. +17175550123

  -- none | pending | confirmed | unsubscribed | bounced
  email_status        TEXT NOT NULL DEFAULT 'none',
  -- none | pending | confirmed | unsubscribed
  phone_status        TEXT NOT NULL DEFAULT 'none',

  email_confirmed_at  TEXT,
  phone_confirmed_at  TEXT,

  -- Evidence captured at the moment the form was submitted.
  consent_ip          TEXT,
  consent_user_agent  TEXT,
  consent_source      TEXT NOT NULL DEFAULT 'website',  -- website | meeting_signup | import
  consent_version     TEXT,                              -- e.g. '2026-08-05.v1'

  zip                 TEXT,
  notes               TEXT,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email        ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_phone        ON subscribers(phone);
CREATE INDEX IF NOT EXISTS idx_subscribers_email_status ON subscribers(email_status);
CREATE INDEX IF NOT EXISTS idx_subscribers_phone_status ON subscribers(phone_status);

-- Append-only. This is the compliance record.
CREATE TABLE IF NOT EXISTS consent_events (
  id             TEXT PRIMARY KEY,
  subscriber_id  TEXT,
  channel        TEXT NOT NULL,   -- email | sms
  action         TEXT NOT NULL,   -- requested | confirmed | opt_out | resubscribe | help | bounced
  detail         TEXT,            -- consent wording shown, or inbound SMS body, etc.
  ip             TEXT,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_events_sub  ON consent_events(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_consent_events_time ON consent_events(created_at);

-- Single-use, expiring links for email confirmation and one-click unsubscribe.
CREATE TABLE IF NOT EXISTS tokens (
  token          TEXT PRIMARY KEY,
  subscriber_id  TEXT NOT NULL,
  purpose        TEXT NOT NULL,   -- confirm_email | unsubscribe_email
  expires_at     TEXT NOT NULL,
  used_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tokens_sub ON tokens(subscriber_id);

-- Crude per-IP throttle so the public form can't be used to spam people
-- with confirmation emails/texts. Cleaned opportunistically.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket      TEXT PRIMARY KEY,   -- e.g. 'subscribe:203.0.113.9'
  count       INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);
