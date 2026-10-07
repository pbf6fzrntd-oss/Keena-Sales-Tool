# Client and offering qualification review

Reviewed 2026-10-07. Source attachments and customer identities remain private and outside GitHub. The local importer found 330 contact rows and 290 distinct company names; formatted empty rows did not become customers. Contact identity matching does not determine active-client status. Corporate domains from supplied contacts are affiliation-review hints.

## Implemented

- Local XLSX importer using Python's standard library; no customer records in source code.
- Name/alias screening before weekly lead cap and Apollo prospect imports; domain overlap review and block.
- Current client screening on historical dashboard records; Apollo search requires a valid registry and rejects selected client domains before calling Apollo.
- Named product/pain/buyer-role mapping with references to supplied deck slides. Multiple products can match one source.
- Added document indexing, records release, personalization, barcode and claims/ETL/MDM signals. Removed automatic standalone disaster recovery and patient engagement keyword qualification because the reviewed material does not justify those as direct standalone Keena offerings.

## Jev review

Jev model `jev-1.13.0` assessed nine proposed rules using aggregate client facts and summarized offerings. No client names, contact emails or raw attachments were sent. Its numeric affirmation values reflect assessments of the proposals, not lead win probabilities or tested accuracy:

| Proposal | Jev affirmation |
|---|---:|
| All workbook accounts remain active regardless of contact MATCH_STATUS | 0.93 |
| Keep customer data outside public repository | 0.88 |
| Existing-client expansion requires owner/current service knowledge | 0.83 |
| Recheck sources, procurement scope and dates | 0.82 |
| Buyer roles depend on offering and trigger | 0.79 |
| Active-client screening | 0.74 |
| Specific pain before purchase-intent claims | 0.74 |
| Capture outcome and qualification feedback before predictive fitting | 0.73 |
| Small scoped Apollo pilot after client suppression | 0.68 |

These were assessments of recommendations supplied for evaluation, not unsolicited prose suggestions from Jev. Additional useful inputs: account owner, installed EHR, purchased Keena products, parent/domain aliases, budget/timing, won/lost and disqualification reasons. No outcome-based predictive model was trained from positive customer examples alone.

## Apollo next step

Set an API key with People API Search access in the local server environment and restart. Verify actual endpoint access with one account-scoped search. No key was supplied, so live Apollo access and enrichment remain untested. Official reference: https://docs.apollo.io/reference/people-api-search (checked 2026-10-07). Search returns buyer previews; email and phone require separate enrichment. Keep hiring signals separate from verified procurements and buyer profiles.
