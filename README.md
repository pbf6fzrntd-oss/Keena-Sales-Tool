# Keena Growth Ops — local internal sales dashboard

Keena's opportunity pipeline and Apollo prospect workspace for a single operator.
No hosting or public deployment is required. Dev and production-mode commands bind
only to `127.0.0.1`; production here means a compiled app running on your computer.
Use Node 24+.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Edit .env.local: set KEENA_ACCESS_KEY to a unique password (24+ characters).
npm run build
npm start
```

Open http://127.0.0.1:3000 and sign in with username `keena` and your configured
password. Use `npm run dev` while developing. Keep KEENA_ORIGIN aligned with the
address and port you open. A blank/short password denies access.
For an isolated fictional preview set `KEENA_DEMO=1` in `.env.local`. Demo mode
bypasses authentication but disables live Apollo calls. Keep it off for real work.

## Workflow

- Opportunities: all-time and weekly views, stage/service/source filters, source
  review and due follow-up queues, owner, next action/date, notes, and CSV export.
- Source discovery: follow WEEKLY_SEARCH_RUNBOOK.md, verify source URLs and dates,
  then run `npm run leads:ingest -- /absolute/path/candidates.json`.
  Reload saved queue reads the database; it does not discover new opportunities.
  The 15/week opportunity cap does not apply to Apollo prospects.
- Apollo: enter healthcare account domains and buyer titles, optionally locations
  and page; review results and save selected people. Saved prospect stages include
  do-not-contact. Reimports preserve existing notes and stages. Export a separate
  prospect CSV. Apollo people are unqualified prospects, not buying-intent evidence.
- Follow-up fields and notes save on blur/date change. Stage changes save immediately.
  Stale versions are rejected; reload after conflicts before repeating edits.

## Connect Apollo when ready

Set `APOLLO_API_KEY` in `.env.local`, restart the local server, then run a scoped
search. The key stays server-side and must allow the people API search endpoint.
A configured-key indicator does not certify account access. Search uses Apollo's
`POST /api/v1/mixed_people/api_search`, fixed 25-result pages, manual pagination,
15-second timeouts and safe errors. It does not reveal email/phone data, enrich
contacts, send messages, or enroll sequences. Enrichment is a future explicit step.
Official reference: https://docs.apollo.io/reference/people-api-search
Live account access remains untested until a real key is supplied.

## Local persistence and backups

Transactional SQLite lives at `.local/pipeline.json.sqlite`, or at
`KEENA_DATA_FILE + '.sqlite'` when overridden. Existing legacy JSON at that path
is migrated on first use. Opportunity and prospect data stay local; no lead data,
passwords, API keys or databases belong in GitHub. `.gitignore` excludes them.
Stop the local app and ingestion processes before copying the database to a
private backup. Restore with the app stopped; restart and verify saved counts.
Demo data uses a separate `.demo` directory.

## Validation

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then
`npm run test:http` (starts a temporary authenticated app on port 3107).
Apollo transport tests use mocked responses; they do not spend credits or prove
live access. Jev evaluates supplied state; it does not execute browser/tests.

### Active-client screening and product matching

Before Apollo discovery, import your active-client workbook locally:

```sh
python3 scripts/import-clients.py /absolute/path/to/active-clients.xlsx
```

The importer reads `COMPANYNAME`, `COMPANYNAME_CLEAN`, names, titles, emails and states. All named organizations are active clients, regardless of the spreadsheet's contact `MATCH_STATUS`. Blank formatted rows are ignored. Customer/contact records go only into ignored `.local/clients.json`; never commit that file, the workbook, or the deck to this public repository. Transfer the registry separately to your own local installation. Reimport replaces it, so preserve any manually curated aliases in your private backup.

Exact normalized names and aliases block new-logo lead and prospect imports. Corporate email-domain overlaps also block imports pending account-owner affiliation review. Domains are hints extracted from contacts, not verified company ownership; common personal email providers do not suppress whole domains. Parent companies, subsidiaries, renamed accounts and unusual personal email providers require manual review. Historical leads and saved prospects receive current screening labels without deleting your notes. Missing or invalid client data cannot silently pass an Apollo search.

Product hypotheses include source slide references and suggested buyer titles. Fit scores remain transparent keyword heuristics, not trained win probabilities. Confirm current EHR, purchased Keena services, project scope, owner, buying authority, timing, approved budget and competing vendors in discovery. Existing-client expansion stays with the account owner. The supplied client list does not establish installed services, account size, revenue, or conversion outcomes.

Start Apollo with one reviewed non-client account and a maximum of 25 results per page. Choose buyer titles for the relevant offering; verify returned account identity, role and source evidence before saving. Email/phone enrichment is a separate future integration. No outreach or campaign enrollment occurs here.
