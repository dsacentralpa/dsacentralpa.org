"""
SUPERSEDED — do not run. Use scripts/import_list.py instead.

This script pushed all 43 phone numbers from the spreadsheet directly into Twilio
Verify. Those numbers came from paper sign-up sheets, which is not prior express
written consent for automated text messages. Bulk-loading them is the single most
likely way to get the chapter's number blocked by carriers, and it cannot be undone
once people start reporting the messages as spam.

scripts/import_list.py does the safe version: emails only, re-permission first,
phone numbers stored but never texted. See docs/CHAPTER-MEMO.md for the reasoning.

Kept only for reference. The guard below stops it running by accident.
"""

import sys

sys.exit(
    "migrate.py is superseded and intentionally disabled.\n"
    "Run:  python scripts/import_list.py plan\n"
    "Why:  it bulk-added un-consented phone numbers to Twilio. "
    "See docs/CHAPTER-MEMO.md."
)

# --- original script preserved below, unreachable ---

import pandas as pd
import re
from twilio.rest import Client
from dotenv import load_dotenv
import resend
import os

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")

resend.api_key = RESEND_API_KEY
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def clean_phone(phone_num):
    phone_clean = re.sub(r'\D', '', phone_num)
    if not phone_clean.startswith('1'):
        phone_clean = f"1{phone_clean}"
    return f"+{phone_clean}"

def migrate_list(file_path="contact_list.xlsx"):
    df = pd.read_excel(file_path)
    # Ensure required columns exist
    for col in ["name", "email_flag", "email", "phone_flag", "phone", "status"]:
        if col not in df.columns:
            df[col] = None if col != "name" else df["name"]
        df[col] = df[col].fillna("") if col != "name" else df[col]
        df[col] = df[col].astype(str) if col != "name" else df[col]

    for idx, row in df.iterrows():
        name = row["name"]
        has_email = str(row["email_flag"]).strip() == "1"
        has_phone = str(row["phone_flag"]).strip() == "1"
        email = row["email"] if has_email else None
        phone = row["phone"] if has_phone else None

        status_updates = []

        # Process Email
        if has_email and email and pd.notna(email):
            if re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
                try:
                    first_name = name.split()[0] if name else ""
                    last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
                    resend.contacts.create(email=email, first_name=first_name, last_name=last_name)
                    status_updates.append("email_added")
                    print(f"✅ Email added: {email} ({name})")
                except Exception as e:
                    status_updates.append("email_failed")
                    print(f"⚠️ Email failed ({email}): {e}")
            else:
                status_updates.append("email_invalid")
                print(f"⚠️ Invalid email format, skipping: {email}")

        # Process Phone (Twilio Verify)
        if has_phone and phone and pd.notna(phone):
            phone_e164 = clean_phone(phone)
            if len(phone_e164) == 12 and phone_e164.startswith("+1"):
                try:
                    twilio_client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).contacts.create(
                        friendly_name=name,
                        phone_number=phone_e164
                    )
                    status_updates.append("phone_added")
                    print(f"✅ Phone added: {phone_e164} ({name})")
                except Exception as e:
                    status_updates.append("phone_failed")
                    print(f"⚠️ Phone failed ({phone_e164}): {e}")
            else:
                status_updates.append("phone_invalid")
                print(f"⚠️ Invalid phone format, skipping: {phone}")

        # Update Excel status
        if not status_updates:
            df.at[idx, "status"] = "skipped_no_contact"
        else:
            df.at[idx, "status"] = "pending_consent"  # Default for new list
            # You can expand this later to track verification/consent
        print()

    df.to_excel(file_path, index=False)
    print(f"✅ Migration complete. Saved to {file_path}")

if __name__ == "__main__":
    migrate_list()
