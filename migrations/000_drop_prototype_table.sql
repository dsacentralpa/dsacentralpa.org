-- ONE-TIME cleanup. Run this ONCE, before schema.sql, then never again.
--
-- The first prototype worker created a 4-column `subscribers` table
-- (id, email, phone, created_at) on every request. Because schema.sql uses
-- CREATE TABLE IF NOT EXISTS, that stale table silently blocks the real schema
-- and you get "no such column: email_status".
--
-- This table never held real member data — the members live in the
-- spreadsheets — so dropping it is safe.
--
--   npx wrangler d1 execute dsa-list-db --local  --file=./migrations/000_drop_prototype_table.sql
--   npx wrangler d1 execute dsa-list-db --remote --file=./migrations/000_drop_prototype_table.sql
--
-- DO NOT run this after the list is live. It would delete the real list.
-- Check first:  npm run db:stats

DROP TABLE IF EXISTS subscribers;
