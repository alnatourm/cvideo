# CVIDEO Discovery Policy v1

Status: FACTORY-FROZEN FOR CURRENT BUILD SLICE

## Default privacy
Candidate profiles are **private by default** and are not returned by recruiter discovery until the candidate explicitly enables discovery.

## Candidate publication gate
A candidate may enable discovery only when the profile has:
- a ready 30-second Introduction Video
- a primary category and subcategory
- at least one preferred role
- at least one skill

The candidate may disable discovery at any time.

## Who may discover candidates
Only authenticated company-side roles may use recruiter discovery:
- company_owner
- company_admin
- recruiter

Candidate accounts cannot access recruiter discovery. Discovery is not a public candidate feed.

## Company verification
Company-verification gating for search/contact remains deferred. This slice does not claim that every searching company has been verified. A later Product/Factory decision may enable a verification requirement before search, chat, or interview actions.

## Safe recruiter read model
Recruiter search/detail responses may expose approved professional profile information only. They must not expose:
- account email or password/security fields
- session/security identifiers
- database user IDs
- raw storage keys
- private CV storage paths
- internal moderation metadata

Introduction-video playback URLs are not fabricated. They will be supplied only through the approved media-provider boundary when that integration is implemented.

## Ranking
This slice uses deterministic cursor pagination and does not introduce AI candidate scoring, personality analysis, face analysis, employability scores, match percentages, or ATS-style ranking claims.

## Canonical product flow
Search -> Watch -> Save -> Chat -> Interview
