# Submission checklist (human actions; nothing here has been done)

Rules re-read from https://nearhackathon.com/HACKATHON.md on 2026-10-30. Re-read again on the day: rules can change.

Key facts: submissions are accepted only 2026-11-01 to 2026-11-14 (deadline 2026-11-14T23:59Z) and cannot be edited; the repo must be public with a LICENSE; the human posts the X post and submits.

## Before pushing
- [ ] Confirm the copyright holder in `LICENSE` ("Onyewuchi Emmanuel", taken from `git config user.name`). Change it if you want a different name.
- [ ] Confirm the README statement that this repo does not import or vendor Wucant code; and check the Wucant URL (it returned 404 to an unauthenticated fetch; it may be private. If it is private, make it public or the README link is dead).
- [ ] Create the new, separate GitHub repo for NearQuery and give its URL.
- [ ] Review `git ls-files` (Claude will print it) and say OK. Check: no `.env`, no `data/raw/`, no DefiLlama CSVs.
- [ ] Commits in your name only, no Claude co-author lines.

## Repo and hosting
- [ ] Tag the first commit `pre-hackathon`, the final one `hackathon-submission`; README diff link already points at EmekaManuel/nearquery.
- [ ] Enable GitHub Pages (source: GitHub Actions) and run the `dashboard` workflow once; set `NEXT_PUBLIC_SITE_URL` if you want absolute og:image URLs. Keep the site up until at least 2026-11-18, ideally 2026-11-25.
- [x] Feb 9 to Mar 20 gap filled (2026-11-02) via a second Cloud project; cache now has every day from 2026-01-01.

## Demo and post
- [ ] Record the demo (see DEMO_SCRIPT.md).
- [ ] Publish the X post (X_POST.md) with the video; keep the link.

## Submit (human confirms)
- [ ] Idea text (IDEA.md), contact details, NEAR mainnet payout account, consent to the contact notice.
- [ ] Project URL and demo URL (each max 300 characters).
- [ ] Submit once. Claude prints the JSON payload first and waits for your yes.
