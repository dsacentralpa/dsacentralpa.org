# Consent model

How the system captures, stores, and honours consent. This is the compliance-relevant part
of the codebase.

## Requirements addressed

| Requirement | Source | Implementation |
|---|---|---|
| Prior express written consent before automated SMS | TCPA; CTIA messaging principles | Separate unchecked checkbox with full disclosure, followed by SMS confirmation reply |
| Consent records demonstrable on request | Carrier / A2P registration review | `consent_events`, append-only |
| Functioning opt-out in commercial email | CAN-SPAM | Tokenised unsubscribe link plus `List-Unsubscribe` headers |
| Physical postal address in commercial email | CAN-SPAM | `MAILING_ADDRESS`; bulk send is blocked while unset |
| Honour SMS opt-out keywords | CTIA | `STOP`, `HELP`, `START` handled in the inbound webhook |

## Signup flow

Email and SMS are independent. A subscriber may confirm one and not the other; each channel
has its own status column and its own confirmation step.

```
form submission
  ├─ validate, honeypot, rate limit
  ├─ upsert subscriber          email_status / phone_status = 'pending'
  ├─ record consent_event       action = 'requested'
  ├─ email: send confirmation link
  └─ SMS:   send confirmation request

confirmation
  ├─ email: link click          → 'confirmed'
  └─ SMS:   inbound YES         → 'confirmed'
  └─ record consent_event       action = 'confirmed'
```

No message other than the confirmation itself is sent to an address or number in `pending`.

## What is recorded

Each `consent_events` row stores:

- `channel` — `email` or `sms`
- `action` — `requested`, `confirmed`, `opt_out`, `resubscribe`, `help`, `send_failed`
- `detail` — the exact consent language displayed at the time, or the inbound message body
- `ip`, `user_agent`, `created_at`

`CONSENT_VERSION` is recorded on the subscriber row. Changing the consent language requires
incrementing it, so each record identifies which wording that person agreed to.

**The table is append-only.** Rows are never updated or deleted, including when a subscriber
is removed. A deletion request clears the `subscribers` row; the consent events remain as
the record that consent was given and subsequently withdrawn.

## Opt-out

**Email.** Every message carries a tokenised unsubscribe link and `List-Unsubscribe` /
`List-Unsubscribe-Post` headers, enabling mail-client unsubscribe without opening the
message. Unsubscribe tokens do not expire and are reused across sends, so links in archived
mail remain functional.

**SMS.** `STOP` and its variants set `phone_status = 'unsubscribed'` and are logged. A
number in that state cannot be re-added through the web form; the subscriber must send
`START` themselves.

**Deletion.** On request, the `subscribers` row is cleared and the consent events retained.

## Imported contacts

`scripts/import_list.py` handles contacts collected outside the web form.

Email addresses are imported with `email_status = 'pending'` and a re-permission message.
Telephone numbers are imported with `phone_status = 'none'` — recorded, but on no list, and
never messaged. Contact details gathered without the required SMS disclosure cannot be used
for automated messaging, and the script provides no path to do so.

Bulk sending is refused while `MAILING_ADDRESS` is unset or a placeholder.

## Abuse controls

- Per-address rate limiting on both public forms
- Honeypot field; submissions that populate it return success without storing anything
- Server-side validation of all input
- Twilio webhook requests verified by HMAC signature; unsigned requests receive 403
- Administrative test-send endpoint rate limited independently of authentication
