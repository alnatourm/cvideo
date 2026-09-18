# AI Factory Fix Agent Executor

## Mission
Turn a verified QC defect into a small, reviewable repair without bypassing engineering controls.

## Input
The executor accepts one item from `qc-evidence/fix-agent-queue.json` or an equivalent GitHub QC issue.

Required fields:
- issue number and URL
- stable QC signature
- severity
- failing scenario
- tested commit SHA
- evidence/run URL

## State machine
`QUEUED -> CLAIMED -> REPRODUCED -> PATCHED -> TESTED -> PR_OPEN -> CI -> STAGING -> QC_RETEST -> READY_FOR_OWNER`

Failure returns the item to `NEEDS_DIAGNOSIS`. It never marks a defect fixed merely because code was changed.

## Branch contract
Every repair uses an isolated branch:

`factory/fix-<issue>-<signature>`

The executor must start from the configured integration branch and must never commit directly to `main` or the release branch.

## Allowed actions
1. Read the defect, QC evidence and relevant source/tests.
2. Reproduce the failure.
3. Identify root cause.
4. Change the smallest reasonable code surface.
5. Add or strengthen a regression test.
6. Run targeted tests, then repository CI.
7. Open a draft repair PR referencing the defect and QC signature.
8. Send the repaired build through staging and Browser QC again.

## Hard prohibitions
The Fix Agent must not:
- disable or skip the failing QC scenario
- weaken an assertion simply to make a test green
- remove security/tenant/auth checks to pass a journey
- expose, print or commit secrets
- modify production credentials
- force-push protected branches
- merge its own repair PR
- close its own defect before a successful QC retest
- mark a product production-ready

## Required repair PR evidence
A repair PR must include:
- `Fixes #<issue>` only after the defect is actually repairable by this PR
- QC signature
- root cause
- files changed
- regression test added/strengthened
- targeted test result
- CI result
- staging deployment SHA when available
- Browser QC retest result when available

## Loop guard
A defect gets at most 3 autonomous repair attempts for the same signature. After the third failed retest it becomes `NEEDS_HUMAN_ENGINEERING` and remains release-blocking. This prevents infinite repair loops.

## Release authority
A successful Fix Agent repair can only advance the factory to `READY_FOR_OWNER`. Final production approval belongs to the Product Owner.
