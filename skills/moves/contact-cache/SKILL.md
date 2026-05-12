---
name: contact-cache
description: >
  Maintain a running list of every person identified or contacted across all
  outreach strategies. CSV-based contact ledger with dedup by LinkedIn URL or
  email address. Stops you from hitting the same person twice when your
  strategies run on a repeating cadence.
tags: [lead-generation]
---

# Contact Cache

Maintain a running list of every person identified or contacted across all outreach strategies. CSV-based contact ledger with dedup by LinkedIn URL or email address. Stops you from hitting the same person twice when your strategies run on a repeating cadence.

## Usage

```bash
# Look up whether specific contacts are already in the cache
python3 skills/contact-cache/scripts/cache.py check --linkedin-urls "https://linkedin.com/in/person1,https://linkedin.com/in/person2"
python3 skills/contact-cache/scripts/cache.py check --emails "john@example.com,jane@example.com"

# Append one contact
python3 skills/contact-cache/scripts/cache.py add --name "John Smith" --linkedin-url "https://linkedin.com/in/johnsmith" --email "john@example.com" --company "Acme Corp" --title "VP Finance" --strategy "2A-hiring-signal"

# Bulk-load contacts from a CSV
python3 skills/contact-cache/scripts/cache.py add --csv /path/to/leads.csv --strategy "2A-hiring-signal"

# Change a contact's status
python3 skills/contact-cache/scripts/cache.py update --linkedin-url "https://linkedin.com/in/johnsmith" --status contacted --notes "Sent intro email 2026-02-24"

# Dump the whole cache
python3 skills/contact-cache/scripts/cache.py export --format csv
python3 skills/contact-cache/scripts/cache.py export --format json
python3 skills/contact-cache/scripts/cache.py export --status contacted
python3 skills/contact-cache/scripts/cache.py export --strategy "2A-hiring-signal"

# Show aggregate counts
python3 skills/contact-cache/scripts/cache.py stats
```

## Data

Contacts live in `skills/contact-cache/data/contacts.csv`. The file is created automatically the first time you write to it.

Dedup uses LinkedIn URL first (preferred), falling back to email. Both keys are normalized then SHA256-hashed (first 16 chars) to form a stable `contact_id`.

## Valid Statuses

`new`, `qualified`, `contacted`, `replied`, `meeting_booked`, `converted`, `not_interested`
