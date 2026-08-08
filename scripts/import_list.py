#!/usr/bin/env python3
"""
Import contacts collected outside the web form.

Email addresses are imported as `pending` and issued a re-permission request. Telephone
numbers are imported as reference data with phone_status='none' and are never messaged:
contact details gathered without the SMS consent disclosure cannot lawfully be used for
automated messaging, and this script provides no path to do so. See docs/CONSENT.md.

Three steps, each inspectable before the next:

  1. python scripts/import_list.py plan
       Reads and normalises the spreadsheet, reports what was found, and writes
       build/import.sql and build/repermission_queue.csv. Sends nothing; writes to no
       database.

  2. npx wrangler d1 execute <database> --remote --file=./build/import.sql

  3. python scripts/import_list.py send [--limit N] [--live]
       Sends the re-permission message. Without --live it prints a preview only.
       Refuses to run while MAILING_ADDRESS is unset or a placeholder (CAN-SPAM).

Requires: pandas, openpyxl, requests, python-dotenv. Reads configuration from .env.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
load_dotenv(ROOT / ".env")

SITE_URL = os.getenv("SITE_URL", "https://dsacentralpa.org")
CHAPTER = os.getenv("CHAPTER_NAME", "Central PA DSA")
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "info@dsacentralpa.org")
FROM_EMAIL = os.getenv("FROM_EMAIL", f"{CHAPTER} <{CONTACT_EMAIL}>")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
CONSENT_VERSION = "import.2026-08-05"
TOKEN_DAYS = 30  # generous — people check email slowly

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


# ------------------------------------------------------------------ cleaning

def clean_email(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip().lower()
    if not text or text in {"nan", "none", "-", "n/a", "na"}:
        return None
    return text if EMAIL_RE.match(text) else None


def clean_phone(value) -> str | None:
    """US mobile -> E.164, else None."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    digits = re.sub(r"\D", "", str(value))
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return None


def clean_name(value) -> tuple[str | None, str | None]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None, None
    text = re.sub(r"\s+", " ", str(value)).strip()
    if not text or text.lower() in {"nan", "none"}:
        return None, None
    parts = text.split(" ")
    return (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (parts[0], None)


def sql_str(value) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


# --------------------------------------------------------------------- plan

def load_rows(path: Path) -> tuple[list[dict], dict]:
    df = pd.read_excel(path)
    df.columns = [str(c).strip().lower() for c in df.columns]

    def pick(*candidates):
        for c in candidates:
            if c in df.columns:
                return c
        return None

    col_name = pick("name", "full name", "contact")
    col_email = pick("email", "email address", "e-mail")
    col_phone = pick("phone", "phone #", "phone number", "mobile", "cell")

    if not col_email and not col_phone:
        sys.exit(f"Could not find email or phone columns in {path.name}. Found: {list(df.columns)}")

    rows, seen_emails, seen_phones = [], set(), set()
    skipped = {"no_contact": 0, "bad_email": 0, "bad_phone": 0, "dupe": 0}

    for _, raw in df.iterrows():
        first, last = clean_name(raw[col_name]) if col_name else (None, None)
        email = clean_email(raw[col_email]) if col_email else None
        phone = clean_phone(raw[col_phone]) if col_phone else None

        # Count things that looked like data but didn't parse.
        if col_email and not email:
            v = raw[col_email]
            if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip():
                skipped["bad_email"] += 1
        if col_phone and not phone:
            v = raw[col_phone]
            if v is not None and not (isinstance(v, float) and pd.isna(v)) and str(v).strip():
                skipped["bad_phone"] += 1

        if not email and not phone:
            skipped["no_contact"] += 1
            continue
        if (email and email in seen_emails) or (phone and phone in seen_phones):
            skipped["dupe"] += 1
            continue

        if email:
            seen_emails.add(email)
        if phone:
            seen_phones.add(phone)

        rows.append(
            {
                "id": str(uuid.uuid4()),
                "first": first,
                "last": last,
                "email": email,
                "phone": phone,
                "token": secrets.token_hex(32) if email else None,
            }
        )

    return rows, skipped


def cmd_plan(args) -> None:
    src = Path(args.file) if args.file else ROOT / "contacts.xlsx"
    if not src.exists():
        sys.exit(f"Spreadsheet not found: {src}")

    rows, skipped = load_rows(src)
    BUILD.mkdir(exist_ok=True)

    expires = (datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)).isoformat()
    lines = [
        "-- Generated by scripts/import_list.py — do not edit by hand.",
        f"-- Source: {src.name}   Generated: {datetime.now(timezone.utc).isoformat()}",
        "--",
        "-- email_status = 'pending'  : re-permission email sent, awaiting click",
        "-- phone_status = 'none'     : number on file, NOT on the SMS list, nobody is texted",
        "BEGIN TRANSACTION;",
    ]

    today = datetime.now(timezone.utc).date()
    for r in rows:
        email_status = "'pending'" if r["email"] else "'none'"
        detail = (
            f"Imported from {src.name}; collected on a paper sign-up sheet at a chapter "
            f"meeting or event. Re-permission email generated {today}."
        )
        lines.append(
            "INSERT OR IGNORE INTO subscribers "
            "(id, first_name, last_name, email, phone, email_status, phone_status, "
            "consent_source, consent_version) VALUES ("
            f"{sql_str(r['id'])}, {sql_str(r['first'])}, {sql_str(r['last'])}, "
            f"{sql_str(r['email'])}, {sql_str(r['phone'])}, "
            f"{email_status}, 'none', "
            f"'meeting_signup', {sql_str(CONSENT_VERSION)});"
        )
        lines.append(
            "INSERT INTO consent_events (id, subscriber_id, channel, action, detail) VALUES ("
            f"{sql_str(str(uuid.uuid4()))}, {sql_str(r['id'])}, 'email', 'requested', "
            f"{sql_str(detail)});"
        )
        if r["token"]:
            lines.append(
                "INSERT INTO tokens (token, subscriber_id, purpose, expires_at) VALUES ("
                f"{sql_str(r['token'])}, {sql_str(r['id'])}, 'confirm_email', {sql_str(expires)});"
            )

    lines.append("COMMIT;")
    (BUILD / "import.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")

    queue = [r for r in rows if r["email"]]
    with (BUILD / "repermission_queue.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["email", "first_name", "confirm_url"])
        for r in queue:
            w.writerow([r["email"], r["first"] or "", f"{SITE_URL}/confirm?token={r['token']}"])

    with_phone = sum(1 for r in rows if r["phone"])
    print(f"\nSource            {src.name}")
    print(f"Usable records    {len(rows)}")
    print(f"  with email      {len(queue)}   -> imported as 'pending', will get one re-permission email")
    print(f"  with phone      {with_phone}   -> stored as reference only, phone_status='none', NOT texted")
    print(f"\nSkipped           no contact info: {skipped['no_contact']}   duplicates: {skipped['dupe']}")
    print(f"                  unparseable email: {skipped['bad_email']}   unparseable phone: {skipped['bad_phone']}")
    print("\nWrote  build/import.sql")
    print("Wrote  build/repermission_queue.csv")
    print("\nNext:  npx wrangler d1 execute dsa-list-db --remote --file=./build/import.sql")
    print("Then:  python scripts/import_list.py send --limit 3 --live\n")


# --------------------------------------------------------------------- send

def render(first: str, url: str) -> tuple[str, str, str]:
    hi = f"Hi {first}," if first else "Hi,"
    subject = f"Confirm you still want {CHAPTER} updates"
    text = f"""{hi}

You're on the {CHAPTER} contact list because you signed up at a meeting or event.

We're moving to a proper system with real unsubscribe links, and we're asking everyone
to confirm rather than assuming you still want to hear from us.

Confirm you want to keep getting chapter updates:
{url}

If you don't click, you'll stop hearing from us. No hard feelings.

Want texts too? Once you confirm, you can add your mobile number at {SITE_URL}.
We are not adding anyone's phone number to the text list without them asking for it.

{CHAPTER}
{CONTACT_EMAIL}
"""
    html = f"""<!doctype html><html><body style="margin:0;padding:0;background:#fbfaf8;
  font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#16161a">
<div style="max-width:560px;margin:0 auto;padding:34px 22px">
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:32px 30px;
              border:1px solid #e3e3e8;border-top:4px solid #ec1f27">
    <p style="margin:0 0 16px">{hi}</p>
    <p style="margin:0 0 16px">You&rsquo;re on the <strong>{CHAPTER}</strong> contact list because
       you signed up at a meeting or event.</p>
    <p style="margin:0 0 26px">We&rsquo;re moving to a proper system with real unsubscribe links, and
       we&rsquo;re asking everyone to confirm rather than assuming you still want to hear from us.</p>
    <p style="margin:0 0 26px">
      <a href="{url}" style="display:inline-block;background:#ec1f27;color:#fff;text-decoration:none;
         padding:14px 30px;border-radius:9px;font-weight:700">Yes, keep me on the list</a>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#5c5c66">
      If you don&rsquo;t click, you&rsquo;ll stop hearing from us. No hard feelings.
    </p>
    <p style="margin:0;padding-top:18px;border-top:1px solid #e3e3e8;font-size:14px;color:#5c5c66">
      <strong style="color:#16161a">Want texts too?</strong> Once you confirm, add your mobile number at
      <a href="{SITE_URL}" style="color:#ec1f27">{SITE_URL}</a>. We are not adding anyone&rsquo;s
      phone number to the text list without them asking for it.
    </p>
  </div>
  <p style="font-size:12.5px;color:#5c5c66;text-align:center;margin:20px 0 0">
    {CHAPTER} &middot; <a href="mailto:{CONTACT_EMAIL}" style="color:#5c5c66">{CONTACT_EMAIL}</a>
    &middot; <a href="{SITE_URL}/privacy" style="color:#5c5c66">Privacy</a>
  </p>
</div></body></html>"""
    return subject, text, html


def cmd_send(args) -> None:
    queue_path = BUILD / "repermission_queue.csv"
    if not queue_path.exists():
        sys.exit("build/repermission_queue.csv not found — run `plan` first.")
    if args.live and not RESEND_API_KEY:
        sys.exit("RESEND_API_KEY missing from .env")

    # CAN-SPAM requires a real physical postal address in commercial email, and this
    # is a bulk re-permission blast rather than a transactional confirmation. Refuse
    # rather than mail 55 people a footer reading "PO Box TBD".
    addr = os.getenv("MAILING_ADDRESS", "")
    if args.live and (not addr or re.search(r"\bTBD\b|\bTODO\b|placeholder", addr, re.I)):
        sys.exit(
            "MAILING_ADDRESS is unset or still a placeholder.\n"
            "CAN-SPAM requires a physical postal address in commercial email, and this\n"
            "is a bulk send. Set a real one (a PO box — not anyone's home address) in\n"
            "wrangler.toml and .env, then retry.\n"
            "Dry runs still work without it: drop --live."
        )

    with queue_path.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if args.limit:
        rows = rows[: args.limit]

    if not args.live:
        print(f"\nDRY RUN — nothing will be sent. {len(rows)} recipient(s) queued.\n")
        subject, text, _ = render(rows[0]["first_name"], rows[0]["confirm_url"]) if rows else ("", "", "")
        if rows:
            print(f"To:      {rows[0]['email']}")
            print(f"From:    {FROM_EMAIL}")
            print(f"Subject: {subject}\n")
            print(text)
        print("Add --live to actually send. Start with --limit 3 --live to test on yourself.\n")
        return

    sent = failed = 0
    for row in rows:
        subject, text, html = render(row["first_name"], row["confirm_url"])
        try:
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": FROM_EMAIL,
                    "to": [row["email"]],
                    "subject": subject,
                    "text": text,
                    "html": html,
                },
                timeout=20,
            )
            if res.status_code < 300:
                sent += 1
                print(f"  sent    {row['email']}")
            else:
                failed += 1
                print(f"  FAILED  {row['email']}  {res.status_code} {res.text[:160]}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  ERROR   {row['email']}  {exc}")

    print(f"\nDone. Sent {sent}, failed {failed}.")
    print("People appear on the live list only once they click their link.\n")


# --------------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_plan = sub.add_parser("plan", help="Clean the spreadsheet and generate import.sql (sends nothing)")
    p_plan.add_argument("--file", help="Path to the spreadsheet (default: contacts.xlsx)")
    p_plan.set_defaults(func=cmd_plan)

    p_send = sub.add_parser("send", help="Send the re-permission email")
    p_send.add_argument("--limit", type=int, help="Only send to the first N people")
    p_send.add_argument("--live", action="store_true", help="Actually send (default is a dry run)")
    p_send.set_defaults(func=cmd_send)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
